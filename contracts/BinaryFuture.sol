pragma solidity 0.4.24;

import "@chainlink/contracts/src/v0.4/ChainlinkClient.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title BinaryFuture is an example contract which demos a two party binary future contract
 */
contract BinaryFuture is ChainlinkClient, Ownable {

  //Chainlink request data
  uint256 public lastPrice;
  uint256 public lastUpdatedTime;

  //Binary Future data
  address public long;
  address public short;
  uint256 public costPrice;
  uint256 public targetPrice;
  uint256 public expiry;
  uint256 public buyInExpiry;
  bool public active;
  bool public executed;

  /**
   * @notice Deploy the contract with a specified address for the LINK
   * and Oracle contract addresses
   * @dev Sets the storage for the specified addresses
   * @param _link The address of the LINK token contract
   */
  constructor(address _link, uint256 offerExpiry, uint256 expiryDays, uint256 _targetPrice, uint256 _costPrice) public {
    if (_link == address(0)) {
      setPublicChainlinkToken();
    } else {
      setChainlinkToken(_link);
    }

    //Set expiry times
    buyInExpiry = now + offerExpiry * 1 minutes;
    expiry = now + expiryDays * 1 days;
    targetPrice = _targetPrice;
    costPrice = _costPrice;
  }

  function takePosition(bool positionIsLong) public payable returns(bool) {
    require(msg.value == costPrice, "Must provide the correct amount of ETH");
    require(buyInExpiry > now, "Contract has expired");

    if (positionIsLong) {
      //Take long position
      require(long == address(0), "Long position already taken");
      long = msg.sender;
    } else {
      //Take short position
      require(short == address(0), "Short position already taken");
      short = msg.sender;
    }

    //Contract is active
    if (short != address(0) && long != address(0)) {
      active = true;
    }
  }

  function getLatestPrice() public {
    //Create the chainlink request
    createRequestTo(
      0xa0BfFBdf2c440D6c76af13c30d9B320F9d2DeA6A, //SDL Ropsten Oracle Address
      'a0ea97f6bc19480fa069f7ca8e4c5ee7', //uint256 job id for SDL
      1 * LINK, //payment of 1 LINK
      'https://api.coinpaprika.com/v1/tickers/eth-ethereum', //URL for ETH USD price
      'quotes.USD.price', //path for the price
      100000000); //multiply
  }

  function _checkExecution(uint256 price, uint256 time) internal {
    if (time > expiry && active) {
      //Execute option
      if (price > targetPrice) {
        //Long position / buyer gets paid out
        long.transfer(costPrice * 2);
      } else {
        short.transfer(costPrice * 2);
      }
      executed = true;
      active = false;
    }
  }

  function checkExecution(uint256 price, uint256 time) public {
    _checkExecution(price, time);
  }

  /**
   * @notice Returns the address of the LINK token
   * @dev This is the public implementation for chainlinkTokenAddress, which is
   * an internal method of the ChainlinkClient contract
   */
  function getChainlinkToken() public view returns (address) {
    return chainlinkTokenAddress();
  }

  /**
   * @notice Creates a request to the specified Oracle contract address
   * @dev This function ignores the stored Oracle contract address and
   * will instead send the request to the address specified
   * @param _oracle The Oracle contract address to send the request to
   * @param _jobId The bytes32 JobID to be executed
   * @param _url The URL to fetch data from
   * @param _path The dot-delimited path to parse of the response
   * @param _times The number to multiply the result by
   */
  function createRequestTo(
    address _oracle,
    bytes32 _jobId,
    uint256 _payment,
    string memory _url,
    string memory _path,
    int256 _times
  )
    public
    returns (bytes32 requestId)
  {
    Chainlink.Request memory req = buildChainlinkRequest(_jobId, address(this), this.fulfill.selector);
    req.add("url", _url);
    req.add("path", _path);
    req.addInt("times", _times);
    requestId = sendChainlinkRequestTo(_oracle, req, _payment);
  }

  /**
   * @notice The fulfill method from requests created by this contract
   * @dev The recordChainlinkFulfillment protects this function from being called
   * by anyone other than the oracle address that the request was sent to
   * @param _requestId The ID that was generated for the request
   * @param _data The answer provided by the oracle
   */
  function fulfill(bytes32 _requestId, uint256 _data)
    public
    recordChainlinkFulfillment(_requestId)
  {
    lastPrice = _data;
    lastUpdatedTime = now;
    _checkExecution(lastPrice, lastUpdatedTime);
  }

  /**
   * @notice Allows the owner to withdraw any LINK balance on the contract
   */
  function withdrawLink() public onlyOwner {
    LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
  }

  /**
   * @notice Call this method if no response is received within 5 minutes
   * @param _requestId The ID that was generated for the request to cancel
   * @param _payment The payment specified for the request to cancel
   * @param _callbackFunctionId The bytes4 callback function ID specified for
   * the request to cancel
   * @param _expiration The expiration generated for the request to cancel
   */
  function cancelRequest(
    bytes32 _requestId,
    uint256 _payment,
    bytes4 _callbackFunctionId,
    uint256 _expiration
  )
    public
    onlyOwner
  {
    cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
  }
}
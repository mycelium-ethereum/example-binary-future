const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
const { Oracle } = require('@chainlink/contracts/truffle/v0.4/Oracle')
const BinaryFuture = artifacts.require('BinaryFuture')
module.exports = (deployer, network, [defaultAccount]) => {
  // Local (development) networks need their own deployment of the LINK
  // token and the Oracle contract
  if (network.startsWith('ropsten')) {
    //Ropsten Deploy
    deployer.deploy(BinaryFuture, '0x0000000000000000000000000000000000000000', 60, 1, 120 * 100000000, web3.utils.toWei("0.1"))
  } else if (!network.startsWith('live')) {
    LinkToken.setProvider(deployer.provider)
    Oracle.setProvider(deployer.provider)

    deployer.deploy(LinkToken, { from: defaultAccount }).then(link => {
      return deployer
        .deploy(Oracle, link.address, { from: defaultAccount })
        .then(() => {
          deployer.deploy(BinaryFuture, link.address, 30, 1, 120 * 100000000, web3.utils.toWei("5"))
        })
    })
  } else {
    // For live networks, use the 0 address to allow the ChainlinkRegistry
    // contract automatically retrieve the correct address for you
    deployer.deploy(BinaryFuture, '0x0000000000000000000000000000000000000000')
  }
}

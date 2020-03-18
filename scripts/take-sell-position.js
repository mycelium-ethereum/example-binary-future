const BinaryFuture = artifacts.require('BinaryFuture')

/*
  This script allows for a Chainlink request to be created from
  the requesting contract. Defaults to the Chainlink oracle address
  on this page: https://docs.chain.link/docs/testnet-oracles
*/

module.exports = async callback => {
  const binaryFuture = await BinaryFuture.deployed()
  console.log('Creating request on contract:', binaryFuture.address)
  const tx = await binaryFuture.takePosition(true, {from: accounts[0], value: web3.utils.fromWei("0.1")})
  callback(tx.tx)
}

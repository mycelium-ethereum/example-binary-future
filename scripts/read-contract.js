const BinaryFuture = artifacts.require('BinaryFuture')

/*
  This script makes it easy to read the data variable
  of the requesting contract.
*/

module.exports = async callback => {
  const binaryFuture = await BinaryFuture.deployed()
  const data = await binaryFuture.lastPrice.call()
  callback(data)
}

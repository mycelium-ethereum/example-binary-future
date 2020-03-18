/* eslint-disable @typescript-eslint/no-var-requires */
const { oracle } = require('@chainlink/test-helpers')
const { expectRevert, time, BN } = require('openzeppelin-test-helpers')

contract('BinaryFuture', accounts => {
  const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')
  const { Oracle } = require('@chainlink/contracts/truffle/v0.4/Oracle')
  const BinaryFuture = artifacts.require('BinaryFuture.sol')

  const defaultAccount = accounts[0]
  const oracleNode = accounts[1]
  const stranger = accounts[2]
  const consumer = accounts[3]

  // These parameters are used to validate the data was received
  // on the deployed oracle contract. The Job ID only represents
  // the type of data, but will not work on a public testnet.
  // For the latest JobIDs, visit our docs here:
  // https://docs.chain.link/docs/testnet-oracles
  const jobId = web3.utils.toHex('4c7b7ffb66b344fbaa64995af81e355a')
  const url =
    'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY'
  const path = 'USD'
  const times = 100

  // Represents 1 LINK for testnet requests
  const payment = web3.utils.toWei('1')

  let link, oc, futuresContract

  beforeEach(async () => {
    link = await LinkToken.new({ from: defaultAccount })
    oc = await Oracle.new(link.address, { from: defaultAccount })
    futuresContract = await BinaryFuture.new(link.address, 30, 10, 120 * 100000000, web3.utils.toWei("5"), { from: consumer })
    await oc.setFulfillmentPermission(oracleNode, true, {
      from: defaultAccount,
    })
  })

  describe('#createFuture', () => {
    context('As the buyer (long)', () => {
      it('Updates the buyer', async () => {
        await futuresContract.takePosition(true, {from : defaultAccount, value: web3.utils.toWei("5")})
        assert.equal(await futuresContract.long(), defaultAccount)
      })
    })

    context('As the seller (short)', () => {
      it('Updates the seller', async () => {
        await futuresContract.takePosition(false, {from : defaultAccount, value: web3.utils.toWei("5")})
        assert.equal(await futuresContract.short(), defaultAccount)
      })
    })
   })

  describe('#joinFuture', () => {
    context('Can join a future from the opposing side', () => {
      it('Activates the contract', async () => {
        await futuresContract.takePosition(true, {from : defaultAccount, value: web3.utils.toWei("5")})
        await futuresContract.takePosition(false, {from : consumer, value: web3.utils.toWei("5")})
        assert.equal(await futuresContract.active(), true)
      })
    })

    context('Attempting to join on the same side', () => {
      it('reverts', async () => {
        await futuresContract.takePosition(true, {from : defaultAccount, value: web3.utils.toWei("5")})
        await expectRevert(
          futuresContract.takePosition(true, {from : consumer, value: web3.utils.toWei("5")}),
          "Long position already taken"
        )
      })
    })
   })

     describe('#payoutFuture', () => {
    context('Price is above the target price', () => {
      it('Pays out the buyer', async () => {
        var balanceBefore = await web3.eth.getBalance(defaultAccount);
        await futuresContract.takePosition(true, {from : defaultAccount, value: web3.utils.toWei("5")})
        await futuresContract.takePosition(false, {from : consumer, value: web3.utils.toWei("5")})
        await futuresContract.checkExecution(121 * 100000000, Math.round((new Date() / 1000), 0) + 864000)
        var balanceAfter = await web3.eth.getBalance(defaultAccount)
        var bnBefore = new BN(balanceBefore.toString())
        var bnAfter = new BN(balanceAfter.toString())
        assert.equal(bnAfter.sub(bnBefore) < web3.utils.toWei("5"), true)
        assert.equal(bnAfter.sub(bnBefore) > web3.utils.toWei("4.8"), true)
      })
    })

    context('Price is below the target price', () => {
      it('Pays out the seller', async () => {
        var balanceBefore = await web3.eth.getBalance(consumer);
        await futuresContract.takePosition(true, {from : defaultAccount, value: web3.utils.toWei("5")})
        await futuresContract.takePosition(false, {from : consumer, value: web3.utils.toWei("5")})
        await futuresContract.checkExecution(119 * 100000000, Math.round((new Date() / 1000), 0) + 864000)
        var balanceAfter = await web3.eth.getBalance(consumer)
        var bnBefore = new BN(balanceBefore.toString())
        var bnAfter = new BN(balanceAfter.toString())
        assert.equal(bnAfter.sub(bnBefore) < web3.utils.toWei("5"), true)
        assert.equal(bnAfter.sub(bnBefore) > web3.utils.toWei("4.8"), true)
      })
    })

   })
})

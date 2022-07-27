const { assert, expect } = require('chai')
const { developmentChains, networkConfig } = require('../../helper-hardhat-config')
const { ethers, network } = require('hardhat')

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('Raffle Unit Test', function () {
          let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer // A way to get the deployer from a promise.
              await deployments.fixture(['all'])
              raffle = await ethers.getContract('Raffle', deployer)
              VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer)
              raffleEntranceFee = raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          /* ALWAYS at first, we want to test the constructor */
          describe('Constructor', function () {
              it('Initializes the raffle correctly', async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), '0')
                  assert.equal(interval.toString(), networkConfig[chainId]['interval'])
              })
          })

          describe('enterRaffle', function () {
              it('Should revert for not cap the entrance fee', async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith('Raffle__NoFeeCap')
              })

              it('Should record player when they enter', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  let numberOfPlayers = await raffle.getNumberOfPlayers()
                  const player = await raffle.getPlayer(0)
                  assert.equal(player, deployer)
                  assert.equal(numberOfPlayers.toString(), '1')
              })

              it('Should emit a event', async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      'RaffleEnter'
                  )
              })

              /* Okey this one is a little tricky!*/
              it('Should revert because raffle is not open', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  /* In order to set the raffle into a CALCULATING state, we want to call performUpkeep() function
                     But performUpkeep() is called only if checkUpkeep() returns a true.
                     So we want to pretend to be the chainlink keeper to call checkUpkeep() and pass all the parameters to get a true value.
                  */
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  /* 'emv_increaseTime' will increase the time of the hardhat blockchain in order to skip the interval time
                     so we dont have to wait the interval every time we want to run this test 
                  */
                  await network.provider.send('evm_mine', []) // We want to mine an another extra block
                  await raffle.performUpkeep([]) // Now call the performUpkeep pretending be the chainlink keeper
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      'Raffle__NotOpen'
                  )
              })
          })

          describe('checkUpkeep', function () {
              it('Should return false because no ETH', async function () {
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine', [])
                  /* Since checkUpkeep is a public function, solidity thinks that we want to send a transaction to checkUpkeep
                   Well, we dont want to send a transaction but we want to see what upkeepNeeded return
                   So in order to do that, we call it with callstatic
                   Callstatic simulate send a transaction and return what would response.
                */
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it('Should return false if raffle is not open', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine', [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), '1')
                  assert(!upkeepNeeded)
              })

              it('Should return false if raffle not passed the interval time', async function () {
                  await network.provider.send('evm_increaseTime', [interval.toNumber() - 1])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it('Should return true if raffle has players, funds, pass the interval time and is open', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), '0')
                  assert(upkeepNeeded)
              })
          })

          describe('performUpkeep', function () {
              it('Should run if checkUpkeep return true', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine', [])
                  const tx = await raffle.performUpkeep([])
                  // We dont need to call checkUpkeep() function because performUpkeep() function already call it!
                  assert(tx)
              })

              it('Should revert if checkUpkeep return false', async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      'Raffle__UpkeepNotNeeded(0, 0, 0)'
                  )
              })

              it('Should change the state of the raffle and run vrfCoordinator function', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
                  await network.provider.send('evm_mine', [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() === '1')
              })
          })
      })

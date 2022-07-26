const { assert, expect } = require('chai')
const { developmentChains, networkConfig } = require('../../helper-hardhat-config')
const { ethers, network } = require('hardhat')

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('Raffle Unit Test', async function () {
          let raffle, VRFCoordinatorV2Mock
          const chainId = network.config.chainId

          beforeEach(async function () {
              const { deployer } = await getNamedAccounts()
              await deployments.fixture(['all'])
              raffle = await ethers.getContract('Raffle', deployer)
              VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer)
          })

          /* ALWAYS at first, we want to test the constructor */
          describe('Constructor', async function () {
              it('Initializes the raffle correctly', async function () {
                  const raffleState = await raffle.getRaffleState()
                  const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), '0')
                  assert.equal(interval.toString(), networkConfig[chainId]['interval'])
              })
          })

          describe('enterRaffle', async function () {
              it('Should revert for not cap the entrance fee', async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith('Raffle__NoFeeCap')
              })
          })
      })

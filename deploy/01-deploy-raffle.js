const { network, ethers } = require('hardhat')
const { developmentChains, networkConfig } = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')

const VRF_SUBS_FUND_AMOUNT = ethers.utils.parseEther('2')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let VRFCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
        VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUBS_FUND_AMOUNT)
    } else {
        VRFCoordinatorV2Address = networkConfig[chainId].vrf
        subscriptionId = networkConfig[chainId]['subscriptionId']
    }

    const callbackGasLimit = networkConfig[chainId]['callbackGasLimit']
    const entranceFee = networkConfig[chainId]['entranceFee']
    const gasLane = networkConfig[chainId]['gasLane']
    const interval = networkConfig[chainId]['interval']

    const args = [
        VRFCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]

    const raffle = await deploy('Raffle', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log('Verifying...')
        await verify(raffle.address, args)
    }
    log('<-------------------------------->!!!')
}

module.exports.tags = ['all', 'raffle']

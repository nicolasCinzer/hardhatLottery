const { network } = require('hardhat')
const { developmentChains } = require('../helper-hardhat-config')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let VRFCoordinatorV2Address

    if (developmentChains.includes(network.name)) {
        const VRFCoordinatorV2Mock = await get('VRFCoordinatorV2Mock')
        VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address
    }

    const args = []
    const raffle = await deploy('Raffle', {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
}

const { ethers } = require('hardhat')

const networkConfig = {
    4: {
        name: 'rinkeby',
        vrf: '0x6168499c0cFfCaCD319c818142124B7A15E857ab',
        entranceFee: ethers.utils.parseEther('0.01'),
        gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        subscriptionId: '0',
        callbackGasLimit: '500000',
        interval: '30',
    },
    31337: {
        name: 'Hardhat',
        entranceFee: ethers.utils.parseEther('0.01'),
        gasLane: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        callbackGasLimit: '500000',
        interval: '30',
    },
}

const developmentChains = ['localhost', 'hardhat']
const frontEndContractsFile = '../nnextjs-hh-lottery/constants/contractAddresses.json'
const frontEndAbiFile = '../nnextjs-hh-lottery/constants/abi.json'

module.exports = {
    networkConfig,
    developmentChains,
    frontEndContractsFile,
    frontEndAbiFile,
}

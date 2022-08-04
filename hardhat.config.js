require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('hardhat-deploy')
require('solidity-coverage')
require('hardhat-gas-reporter')
require('hardhat-contract-sizer')
require('dotenv').config()

const RINKEBY_RPC = process.env.RINKEBY_RPC || 'https://eth-rinkeby'
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xkey'
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'apikey'
const COINMARKETCAP_API_KEY = process.env.CMC_API_KEY || 'apikey'

module.exports = {
    solidity: '0.8.9',
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        rinkeby: {
            url: RINKEBY_RPC,
            accounts: [PRIVATE_KEY],
            chainId: 4,
            blockConfirmations: 6,
        },
        localhost: {
            url: 'http://127.0.0.1:8545/',
            chainId: 31337,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: false,
        currency: 'USD',
        outputFile: 'gas-report.txt',
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    contractSizer: {
        runOnCompile: false,
        only: ['Raffle'],
    },
    mocha: {
        timeout: 300000,
    },
}

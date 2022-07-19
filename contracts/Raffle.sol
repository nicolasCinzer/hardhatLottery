// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';

error Raffle__NoFeeCap();

abstract contract Raffle is VRFConsumerBaseV2 {
    /*  State Vatiables  */
    uint256 private immutable i_entranceFee;
    /*  Payable bc we want to pay the winner of the raffle  */
    address payable[] private s_players;
    /* 
        Just like pricefeed, VRFCoordinator will be the interface of the contract that
        Calculate the random numbers 
    */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    /*  GAS LANE is the maximum gas price you are willing to pay for a request in wei */
    bytes32 private immutable i_gasLane;
    /* 
        Subscription ID will be the subscription ID of the contract that we will pay for
        do some computacional work for us. This contract will be the responsable of 
        calculate the random number. 
    */
    uint64 private immutable i_subscriptionId;
    /*
        callbackGasLimit will be how much computation will cost fulfillRandomWords()
        This prevent spent a lot of gas in case that our code is written to do that
    */
    uint32 private immutable i_callbackGasLimit;
    /*
        REQUEST_CONFIRMATIONS will be the amount of confirmation that the Chainlink node
        will wait before responding... Like block confirmation. 
    */
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    /*  The amount of random numbers we want  */
    uint32 private constant NUM_WORDS = 1;

    /*  Events  */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);

    /*  Sets the entrance fee when deploys  */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    /*  Enter the raffle by top up at least the entrance fee  */
    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NoFeeCap();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function requestRandomWinner() external {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {}

    /*  View / Pure Functions  */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}

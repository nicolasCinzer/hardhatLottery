// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol';

error Raffle__NoFeeCap();
error Raffle__TransferFail();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A Raffle Contract
    @author Nicolas Cinzer
    @notice This contract is for creating an untamperable decentralized smart contract
    @dev This implement CHAINLINK VRF and CHAINLINK KEEPERS
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /*  TYPE DECLARATIONS  */
    enum RaffleState {
        OPEN, // uint256 0 = OPEN (Under the hood)
        CALCULATING // uint256 1 = CALCULATING (Under the hood)
    }

    /*  STATE VARIABLES  */

    uint256 private immutable i_entranceFee;
    /*  s_players::
        Payable bc we want to pay the winner of the raffle  
    */
    address payable[] private s_players;
    /*  i_vrfCoordinator::
        Just like pricefeed, VRFCoordinator will be the interface of the contract that
        Calculate the random numbers 
    */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    /*  i_gasLane::
        GAS LANE is the maximum gas price you are willing to pay for a request in wei 
    */
    bytes32 private immutable i_gasLane;
    /*  i_subscriptionId::
        Subscription ID will be the subscription ID of the contract that we will pay for
        do some computacional work for us. This contract will be the responsable of 
        calculate the random number. 
    */
    uint64 private immutable i_subscriptionId;
    /*  i_callbackGasLimit::
        callbackGasLimit will be how much computation will cost fulfillRandomWords()
        This prevent spent a lot of gas in case that our code is written to do that
    */
    uint32 private immutable i_callbackGasLimit;
    /*  REQUEST_CONFIRMATIONS::
        REQUEST_CONFIRMATIONS will be the amount of confirmation that the Chainlink node
        will wait before responding... Like block confirmation. 
    */
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    /*  NUM_WORDS::
        The amount of random numbers we want  
    */
    uint32 private constant NUM_WORDS = 1;

    /* RAFFLE VARIABLES */

    /*  s_recentWinner::
        Will store the most recent winner of the raffle 
    */
    address private s_recentWinner;
    /*  s_raffleState::
        Will store the actual state of the raffle
    */
    RaffleState private s_raffleState;
    /*  s_lastTimeStamp::
        Will calculate the time elapsed until the last block confirmation 
    */
    uint256 private s_lastTimeStamp;
    /*  s_interval::
        Will be the time that we want to wait to get the winner of the raffle 
    */
    uint256 private immutable i_interval;

    /*  EVENTS  */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winners);

    /*  FUNCTIONS  */
    constructor(
        address vrfCoordinatorV2, 
        uint256 entranceFee,
        bytes32 gasLane, //keyHash
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    /*  Enter the raffle by top up at least the entrance fee  */
    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NoFeeCap();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /*  CHAINLINK KEEPER 
        We gonna use chainlink keeper to automatically run the script that provide us the
        random winner
    */
    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * They look for the 'upkeepNeeded' to return true.
     * The following should be true in order to return true:
     * 1. Our time interval shoul have passed
     * 2. The reffle should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The raffle should be in an 'open' state.
     */
    
    /** @dev calldata type doesn't support strings!!!
        Must be a memory parameter.
     */

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep('');
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{ value: address(this).balance }('');
        if (!success) {
            revert Raffle__TransferFail();
        }
        emit WinnerPicked(recentWinner);
    }

    /*  View / Pure Functions  */
     
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastestTimestamp() public view returns (uint256){
        return s_lastTimeStamp;
    }

    function getRequestConfirmation() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}

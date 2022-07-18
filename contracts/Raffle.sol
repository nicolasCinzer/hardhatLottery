// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

error Raffle__NoFeeCap();

contract Raffle {
    /* State Vatiables */
    uint256 private immutable i_entranceFee;
    /* Payable bc we want to pay the winner of the raffle */
    address payable[] private s_players;

    /* Events */
    event RaffleEnter(address indexed player);

    /* Sets the entrance fee when deploys */
    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NoFeeCap();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}

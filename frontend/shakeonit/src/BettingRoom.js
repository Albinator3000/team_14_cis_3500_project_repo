import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from './UserContext';

function BettingRoom() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [roomPassword, setRoomPassword] = useState('');
    const [isParticipant, setIsParticipant] = useState(false);
    const { user } = useUser();

    const buttonStyle = {
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'inline-block',
        fontSize: '16px',
        cursor: 'pointer',
        borderRadius: '5px',
        marginTop: '10px'
    };

    useEffect(() => {
        async function fetchEventAndParticipants() {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8001/event/${id}/details`);
                const eventData = await response.json();
                setEvent(eventData);
                if (eventData && eventData.eventParty && eventData.eventParty.length > 0) {
                    fetchParticipants();
                }
            } catch (error) {
                console.error('Failed to fetch event:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchEventAndParticipants();
    }, [id]);

    const handleJoin = async () => {
        try {
            const response = await fetch(`http://localhost:8001/event/${id}/add-member`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: user.username, password: roomPassword })
            });
            const data = await response.json();
            if (response.ok) {
                console.log('User added successfully:', data);
                setIsParticipant(true);
                fetchParticipants(); // Refresh participants list after joining
            } else {
                throw new Error(data.message || 'Failed to add user to event');
            }
        } catch (error) {
            console.error('Error joining the event:', error);
        }
    };

    const handleEndGame = async () => {
        console.log("Ending the game...");
        try {
            const response = await fetch(`http://localhost:8001/event/${id}/award-winner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ eventID: id })
            });
            const data = await response.json();
            if (response.ok) {
                console.log('Winner has been awarded successfully:', data);
                alert('Winner has been awarded the event pot.');
            } else {
                throw new Error(data.message || 'Failed to award winner');
            }
        } catch (error) {
            console.error('Error awarding event winner:', error);
            alert('Error awarding event winner: ' + error.message);
        }
    };

    const fetchParticipants = async () => {
        try {
            const response = await fetch(`http://localhost:8001/event/${id}/party`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.eventParty) {
                // Use reduce to filter out duplicates based on _id
                const uniqueParticipants = data.eventParty.reduce((acc, current) => {
                    const x = acc.find(item => item.userID._id === current.userID._id);
                    if (!x) {
                        return acc.concat([current]);
                    } else {
                        return acc;
                    }
                }, []).map(item => item.userID); // Map to extract the userID objects after deduplication
    
                setParticipants(uniqueParticipants);
            }
        } catch (error) {
            console.error('Error fetching participants:', error);
        }
    };
    

    if (loading) return <p>Loading...</p>;
    if (!event) return <p>No event found.</p>;

    return (
        <div>
            <h1>{event.eventName}</h1>
            <p>Pot: ${event.eventPot}</p>
            <p>Buy-In: ${event.eventBuyIn}</p>
            {isParticipant ? (
                <button style={buttonStyle} onClick={handleEndGame}>End Game</button>
            ) : (
                <>
                    <input
                        type="password"
                        placeholder="Room Password"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        style={{ margin: '10px 0', padding: '10px', borderRadius: '10px' }}
                    />
                    <button style={buttonStyle} onClick={handleJoin}>Join Event</button>
                </>
            )}
            <h2>Participants</h2>
            {participants.length > 0 ? (
                <ul>
                    {participants.map(participant => (
                        <li key={participant._id}>{participant.username}</li>
                    ))}
                </ul>
            ) : (
                <p>No participants registered yet.</p>
            )}
        </div>
    );
}

export default BettingRoom;

import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import "./CallApp.css";

const socket = io('https://llamadareactsv.onrender.com');

const CallApp = () => {
    const [me, setMe] = useState('');
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [idToCall, setIdToCall] = useState('');
    const [nombreLlamada, setNombreLlamada] = useState(null);
    const [nombreRecibe, setNombreRecibe] = useState("");

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            myVideo.current.srcObject = stream;
        });

        socket.on('connect', () => {
            console.log(socket.id);
            setMe(socket.id);
        });

        socket.on('callUser', (data) => {
            setNombreRecibe(data.nombreLlamada);
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
        });

        socket.on('callAccepted', (signal) => {
            console.log('Call accepted signal:', signal);
            setCallAccepted(true);
            if (connectionRef.current) {
                connectionRef.current.signal(signal);
            }
        });

        // Cleanup the effect
        return () => {
            socket.off('callUser');
            socket.off('callAccepted');
        };
    }, []);

    const callUser = (id) => {
        if (!stream) {
            console.error('No stream available');
            return;
        }

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on('signal', (data) => {
            console.log('Signal data:', data);
            socket.emit('callUser', { userToCall: id, signalData: data, from: me, nombreLlamada });
        });

        peer.on('stream', (stream) => {
            userVideo.current.srcObject = stream;
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        if (!stream) {
            console.error('No stream available');
            return;
        }

        setCallAccepted(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on('signal', (data) => {
            socket.emit('answerCall', { signal: data, to: caller });
        });

        peer.on('stream', (stream) => {
            userVideo.current.srcObject = stream;
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        if (callerSignal) {
            peer.signal(callerSignal);
        }

        connectionRef.current = peer;
    };

    return (
        <div className='videoContainer'>
            <div className="CallVideoDisplay">
                <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px' }} />
                <video playsInline ref={userVideo} autoPlay style={{ width: '300px' }} />
            </div>

            {receivingCall && !callAccepted && (
                <div className='TeLlama'>
                    <h1>{nombreRecibe} Te está llamando</h1>
                    <button onClick={answerCall}>Responder</button>
                </div>
            )}

            <div>
                <div className="inputsContainer">
                    <input type="text" placeholder='Agregar tu nombre' onChange={(e) => setNombreLlamada(e.target.value)} />
                    <input
                        type="text"
                        placeholder="ID to call"
                        value={idToCall}
                        onChange={(e) => setIdToCall(e.target.value)}
                    />
                    <button onClick={() => callUser(idToCall)}>Call</button>
                </div>
            </div>
        </div>
    );
};

export default CallApp;

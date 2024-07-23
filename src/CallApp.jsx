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
    const [nombreLlamada, setNombreLlamada] = useState('');
    const [nombreRecibe, setNombreRecibe] = useState('');
    const [chatCompartido, setChatCompartido] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [idRecibe, setIdRecibe] = useState('');

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

        // Handle incoming call
        socket.on('callUser', (data) => {
            setNombreRecibe(data.nombreLlamada);
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
            setIdRecibe(data.callerId); // Almacenamos el ID del emisor
        });

        // Handle call acceptance
        socket.on('callAccepted', (data) => {
            console.log('Call accepted signal:', data.signal);
            setCallAccepted(true);
            if (connectionRef.current) {
                connectionRef.current.signal(data.signal);
            }
            setIdRecibe(data.callerId); // Almacenamos el ID del receptor
        });

        // Handle incoming message
        socket.on('msj', (msj) => {
            console.log('Received message:', msj);
            setChatCompartido(prevChat => {
                // Avoid adding duplicate messages
                if (!prevChat.some(chat => chat.mensaje === msj.mensaje && chat.nombre === msj.nombre)) {
                    return [...prevChat, msj];
                }
                return prevChat;
            });
        });

        // Cleanup the effect
        return () => {
            socket.off('callUser');
            socket.off('callAccepted');
            socket.off('msj'); // Make sure to remove the message listener
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

    const enviarMensaje = () => {
        const msjData = { nombre: nombreLlamada, mensaje, to: idRecibe };
        setChatCompartido(prevChat => [...prevChat, msjData])
        console.log('Sending message:', msjData);
        socket.emit('msj', msjData);
        setMensaje('');
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
                <div className="InputInteractionContainer">
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

                    <div className='Chat'>
                        <h1>Chat</h1>
                        <div className="ChatMsjContainer">
                            {chatCompartido.map((msj, index) => (
                                <div key={index} className='msjStyle'>
                                    <strong>{msj.nombre}: {msj.mensaje} </strong>
                                </div>
                            ))}
                        </div>
                        <div className="msjInput">
                            <input
                                type="text"
                                placeholder="Escribe un mensaje"
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                className='inputEnviar'
                            />
                            <button onClick={enviarMensaje} className='enviarBtn'>Enviar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallApp;

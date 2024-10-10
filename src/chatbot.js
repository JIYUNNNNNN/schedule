import React, { useState } from 'react';
import './Chatbot.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // FontAwesomeIcon 불러오기
import { faPaperPlane, faPlus } from '@fortawesome/free-solid-svg-icons'; // 플러스 아이콘 불러오기

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (input.trim() === '') return;

    sendMessage({ type: 'chat', content: input }); // 일반 메시지 전송
  };

  const handleAddEvent = () => {
    if (input.trim() === '') return;

    sendMessage({ type: 'event', content: input }); // 일정 추가 메시지 전송
  };

  const sendMessage = (message) => {
    const userMessage = { text: message.content, isUser: true };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message), // type과 content를 포함한 메시지 전송
    })
      .then((response) => response.json())
      .then((data) => {
        const botMessage = { text: data.reply, isUser: false };
        setMessages((prevMessages) => [...prevMessages, botMessage]);

        if (data.event) {
          const eventMessage = { text: `일정 추가됨: ${data.event.summary}`, isUser: false };
          setMessages((prevMessages) => [...prevMessages, eventMessage]);
        }
      })
      .catch((err) => {
        console.error('Error:', err);
        const errorMessage = { text: '챗봇과 통신 중 오류 발생.', isUser: false };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      });

    setInput('');
  };

  return (
    <div className="chatbox">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={msg.isUser ? 'message user' : 'message bot'}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
          {/* 비행기 아이콘 */}
          <button onClick={handleSendMessage}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
        {/* 플러스 아이콘 */}
        <button onClick={handleAddEvent}>
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}

export default Chatbot;

import React, { useState, useEffect } from 'react';
import './Chatbot.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // FontAwesomeIcon 불러오기
import { faPaperPlane, faPlus } from '@fortawesome/free-solid-svg-icons'; // 아이콘 불러오기

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // 컴포넌트가 처음 렌더링될 때 챗봇이 먼저 자동으로 메시지 전송
  useEffect(() => {
    const initialBotMessage = { text: '오늘은 어떤 일정 관리가 필요하신가요?', isUser: false };
    setMessages((prevMessages) => [...prevMessages, initialBotMessage]);
  }, []); // 빈 배열을 넣어 컴포넌트가 처음 렌더링될 때만 실행되도록

  const handleSendMessage = () => {
    if (input.trim() === '') return;
    sendMessage({ type: 'chat', content: input }); // 일반 메시지 전송
  };

  const handleAddOrDeleteEvent = () => {
    if (input.trim() === '') return;

    // 메시지의 내용에 '삭제'라는 단어가 포함되어 있으면 삭제로 판단
    const messageType = input.includes('삭제') ? 'delete' : 'event';
    sendMessage({ type: messageType, content: input }); // 삭제 또는 일정 추가 메시지 전송
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
          
          // 일정 추가 후 이벤트 목록 새로 가져오기
          fetchEvents();
        }
      })
      .catch((err) => {
        console.error('Error:', err);
        const errorMessage = { text: '챗봇과 통신 중 오류 발생.', isUser: false };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      });

    setInput('');
  };

  // 이벤트 목록 새로 가져오는 함수 추가
  const fetchEvents = () => {
    fetch('http://localhost:3001/api/events')
      .then(response => response.json())
      .then(data => {
        console.log('Fetched events:', data);
        // 여기에 fetched events를 UI에 업데이트하는 로직 추가
      })
      .catch(err => {
        console.error('Error fetching events:', err);
      });
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
          placeholder="무엇을 도와드릴까요?"
        />
        {/* 비행기 아이콘 버튼으로 메시지 전송 */}
        <button onClick={handleSendMessage}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
        {/* 플러스 아이콘 버튼으로 삭제와 추가 처리 */}
        <button onClick={handleAddOrDeleteEvent}>
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}

export default Chatbot;

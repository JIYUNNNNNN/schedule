import React, { useState, useEffect } from 'react';

function AddEventForm({ newEvent, setNewEvent, onSave, selectedEvent, calendar, onClose }) {
  const [startDate, setStartDate] = useState(newEvent.start);
  const [endDate, setEndDate] = useState(newEvent.end);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');

  // 새로운 이벤트가 전달될 때마다 시작일과 종료일을 업데이트
  useEffect(() => {
    setStartDate(newEvent.start);
    setEndDate(newEvent.end);
  }, [newEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const event = {
      summary,
      description,
      start: {
        dateTime: new Date(startDate).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(endDate).toISOString(),
        timeZone: 'Asia/Seoul',
      },
    };

    // 일정 추가 API 호출
    fetch('http://localhost:3001/api/add-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Event added:', data);
        alert('일정이 추가되었습니다.');
        if (calendar) {
          calendar.refetchEvents(); // 캘린더 이벤트 갱신
        }
        onClose(); // 폼 닫기
      })
      .catch((err) => {
        console.error('Failed to add event:', err);
        alert('일정 추가 중 오류가 발생했습니다.');
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          placeholder="제목을 입력해주세요"
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
      </label>
      <label>
        <textarea
          placeholder="내용을 입력해주세요"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>
      <label>
        시작일:
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </label>
      <label>
        종료일:
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </label>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
        <button type="submit">일정 추가</button>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </form>
  );
}

export default AddEventForm;

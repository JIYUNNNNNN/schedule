// OpenWeatherMap API 키 설정
const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY';

// 날씨 데이터를 가져오는 함수
function fetchWeatherData() {
  // 사용자 위치 정보를 기반으로 날씨 데이터를 가져오기 위한 Geolocation API 사용
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    alert('Geolocation is not supported by this browser.');
  }

  // 위치 정보를 가져오는 데 성공한 경우 호출
  function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // OpenWeatherMap API URL
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    // API 호출
    fetch(url)
      .then(response => response.json())
      .then(data => {
        // API로부터 받은 데이터로 HTML 요소 업데이트
        document.querySelector('.temperature').textContent = `${data.main.temp} °C`;
        document.querySelector('.place').textContent = data.name;
        document.querySelector('.description').textContent = data.weather[0].description;
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
      });
  }

  // 위치 정보를 가져오는 데 실패한 경우 호출
  function error() {
    alert('Unable to retrieve your location.');
  }
}

// 버튼 클릭 이벤트 리스너 추가
document.querySelector('.button').addEventListener('click', fetchWeatherData);

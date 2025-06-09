let chart;
let isCandlestick = false;
let currentVolumeData = [];

// Show loading indicator
function showLoading() {
  $('.loading').css('display', 'block');
}

// Hide loading indicator
function hideLoading() {
  $('.loading').css('display', 'none');
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = $('#notification');
  notification.removeClass('notification-success notification-error')
    .addClass(`notification-${type}`)
    .find('.notification-message').text(message);
  notification.fadeIn();
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    notification.fadeOut();
  }, 3000);
}

// Close notification
$('.notification-close').on('click', function() {
  $('#notification').fadeOut();
});

async function loadChart(symbol) {
  showLoading();
  $('#stockSymbol').text(symbol);
  currentVolumeData = [];
  
  const apiKey = 'J2I23738J3AWVR1W';
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data['Time Series (Daily)']) throw new Error('No data found for symbol');
    
    const timeSeriesData = data['Time Series (Daily)'];
    const dates = Object.keys(timeSeriesData).sort();
    const ohlc = dates.map(date => [
      new Date(date).getTime(),
      parseFloat(timeSeriesData[date]['1. open']),
      parseFloat(timeSeriesData[date]['2. high']),
      parseFloat(timeSeriesData[date]['3. low']),
      parseFloat(timeSeriesData[date]['4. close'])
    ]);
    
    // Prepare volume data
    currentVolumeData = dates.map(date => [
      new Date(date).getTime(),
      parseInt(timeSeriesData[date]['5. volume'])
    ]);

    // Update analysis data
    const latestDate = dates[dates.length - 1];
    const previousDate = dates[dates.length - 2];
    const latestData = timeSeriesData[latestDate];
    const previousData = timeSeriesData[previousDate];
    
    const currentPrice = parseFloat(latestData['4. close']).toFixed(2);
    const previousPrice = parseFloat(previousData['4. close']).toFixed(2);
    const change = (currentPrice - previousPrice).toFixed(2);
    const changePercent = ((change / previousPrice) * 100).toFixed(2);
    const changeClass = change >= 0 ? 'positive' : 'negative';
    const changeSign = change >= 0 ? '+' : '';
    
    $('#currentPrice').text(`$${currentPrice}`);
    $('#dailyChange').text(`${changeSign}${change} (${changeSign}${changePercent}%)`).removeClass('positive negative').addClass(changeClass);
    $('#volume').text(parseInt(latestData['5. volume']).toLocaleString());
    $('#prediction').text('-'); // Reset prediction

    chart = Highcharts.stockChart('chart', {
      rangeSelector: { 
        selected: 1,
        buttons: [
          { type: 'week', count: 1, text: '1w' },
          { type: 'month', count: 1, text: '1m' },
          { type: 'month', count: 3, text: '3m' },
          { type: 'month', count: 6, text: '6m' },
          { type: 'ytd', text: 'YTD' },
          { type: 'year', count: 1, text: '1y' },
          { type: 'all', text: 'All' }
        ]
      },
      title: { text: `${symbol} Stock Price` },
      series: [{
        id: 'main-series',
        type: isCandlestick ? 'candlestick' : 'line',
        name: symbol,
        data: ohlc,
        yAxis: 0,
        tooltip: { valueDecimals: 2 }
      }],
      navigator: { enabled: true },
      scrollbar: { enabled: true },
      annotations: [],
      chart: {
        animation: true,
        backgroundColor: 'transparent'
      },
      yAxis: [{
        labels: {
          formatter: function () {
            return '$' + this.value;
          },
          style: {
            color: $('body').hasClass('dark-theme') ? '#e2e8f0' : undefined
          }
        },
        title: { 
          text: 'Price',
          style: {
            color: $('body').hasClass('dark-theme') ? '#e2e8f0' : undefined
          }
        },
        height: '60%',
        lineWidth: 2,
        resize: { enabled: true }
      }],
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>${point.y}</b><br/>',
        valueDecimals: 2
      }
    });
    
    hideLoading();
    showNotification(`${symbol} stock data loaded successfully`);
  } catch (error) {
    console.error('Error loading chart:', error.message);
    hideLoading();
    showNotification('Failed to load stock data. Please try another symbol.', 'error');
  }
}

$('#searchBtn').on('click', () => {
  const symbol = $('#symbol').val().toUpperCase();
  if (!symbol) {
    showNotification('Please enter a stock symbol', 'error');
    return;
  }
  loadChart(symbol);
});

// Allow pressing Enter to search
$('#symbol').on('keypress', function(e) {
  if (e.which === 13) {
    $('#searchBtn').click();
  }
});

$('#toggleChart').on('click', () => {
  if (!chart) {
    showNotification('Load a stock chart first', 'error');
    return;
  }
  isCandlestick = !isCandlestick;
  const symbol = chart.series[0].name;
  loadChart(symbol);
  showNotification(`Changed to ${isCandlestick ? 'candlestick' : 'line'} chart`);
});

$('#addSMA').on('click', () => {
  if (!chart || !chart.series[0].options.data.length) {
    showNotification('Load a stock chart first', 'error');
    return;
  }
  const smaSeries = chart.get('sma-series');
  if (smaSeries) {
    smaSeries.remove();
    showNotification('Removed SMA indicator');
  } else {
    chart.addSeries({
      id: 'sma-series',
      type: 'sma',
      linkedTo: 'main-series',
      name: 'SMA (14)',
      params: { period: 14 },
      color: '#f59e0b'
    });
    showNotification('Added 14-day Simple Moving Average indicator');
  }
});

// $('#addRSI').on('click', () => { ... }); // Keep this comment or remove lines entirely
// $('#addMACD').on('click', () => { ... }); // Keep this comment or remove lines entirely

$('#toggleVolume').on('click', () => {
  if (!chart || !currentVolumeData.length) {
    showNotification('Load a stock chart first', 'error');
    return;
  }
  const volumeSeries = chart.get('volume-series');
  if (volumeSeries) {
    volumeSeries.remove();
    if (chart.get('volume-axis')) { // Check if axis exists before trying to remove
        chart.get('volume-axis').remove();
    }
    showNotification('Volume chart hidden');
  } else {
    // Add y-axis for volume if it doesn't exist (it shouldn't after removal)
    // Or rely on the pre-defined second y-axis if we go that route.
    // For dynamic add/remove, it's cleaner to add axis with series.
    chart.addAxis({
        id: 'volume-axis',
        labels: {
            align: 'right',
            x: -3,
            style: { color: $('body').hasClass('dark-theme') ? '#e2e8f0' : undefined }
        },
        title: {
            text: 'Volume',
            style: { color: $('body').hasClass('dark-theme') ? '#e2e8f0' : undefined }
        },
        height: '35%', // Define height for the volume pane
        top: '65%',    // Position it below the main chart (assuming main is 60-65%)
        offset: 0,
        lineWidth: 2,
        opposite: false // Or true if you want it on the other side
    });
    chart.addSeries({
      id: 'volume-series',
      type: 'column',
      name: 'Volume',
      data: currentVolumeData,
      yAxis: 'volume-axis', // Link to the newly added or existing volume y-axis
      color: '#22c55e', // Green
      tooltip: {
        valueDecimals: 0
      }
    });
    showNotification('Volume chart shown');
  }
  // May need to call chart.reflow() or chart.redraw() if layout issues occur
});

$('#predictBtn').on('click', () => {
  if (!chart) {
    showNotification('Load a stock chart first', 'error');
    return;
  }
  const seriesData = chart.series[0].options.data;
  if (!seriesData || seriesData.length < 30) {
    console.log('Not enough data points for prediction');
    showNotification('Not enough data for prediction', 'error');
    return;
  }
  try {
    const closeValues = seriesData.slice(-30).map(point => point[4]);
    const X = closeValues.map((_, i) => i);
    const { slope, intercept } = linearRegression(X, closeValues);
    const nextDay = intercept + slope * X.length;

    if (isNaN(nextDay) || !isFinite(nextDay)) {
      console.error('Prediction Error: Linear regression resulted in an invalid number.', {
        slope,
        intercept,
        calculatedNextDay: nextDay,
        inputCloseValues: closeValues.slice(0, 10) // Log first 10 for brevity
      });
      throw new Error('Failed to calculate a valid prediction value due to data issues.');
    }
    
    const lastTime = seriesData[seriesData.length - 1][0];
    const nextTime = lastTime + 86400000; // Add one day in milliseconds
    
    // Add annotation to chart
    chart.addAnnotation({
      labels: [{
        point: { xAxis: 0, yAxis: 0, x: nextTime, y: nextDay },
        text: `Predicted: $${nextDay.toFixed(2)}`
      }]
    });
    
    // Update prediction in analysis panel
    $('#prediction').text(`$${nextDay.toFixed(2)}`);
    showNotification('Prediction generated successfully');
  } catch (error) {
    console.error('Prediction error:', error.message);
    showNotification('Failed to generate prediction', 'error');
  }
});

// Dark/Light theme toggle
$('#themeToggle').on('click', function() {
  $('body').toggleClass('dark-theme');
  const isDarkTheme = $('body').hasClass('dark-theme');
  $(this).find('i').toggleClass('fa-sun', isDarkTheme).toggleClass('fa-moon', !isDarkTheme);
  
  // If chart exists, update its theme
  if (chart) {
    const newGlobalOptions = {
      chart: {
        backgroundColor: isDarkTheme ? '#1e293b' : 'transparent'
      },
      xAxis: {
        labels: { style: { color: isDarkTheme ? '#e2e8f0' : undefined } },
        title: { style: { color: isDarkTheme ? '#e2e8f0' : undefined } }
      }
    };
    chart.update(newGlobalOptions);

    // Update each yAxis individually to preserve their specific configurations
    chart.yAxis.forEach(axis => {
      axis.update({
        labels: { style: { color: isDarkTheme ? '#e2e8f0' : undefined } },
        title: { style: { color: isDarkTheme ? '#e2e8f0' : undefined } }
      });
    });
  }
});

// Custom Linear Regression Function
function linearRegression(X, y) {
  const n = X.length;
  const sumX = X.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = X.map((x, i) => x * y[i]).reduce((a, b) => a + b, 0);
  const sumX2 = X.map(x => x * x).reduce((a, b) => a + b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Add dark theme CSS
const darkThemeCSS = `
  .dark-theme {
    background-color: #0f172a;
    color: #e2e8f0;
  }
  
  .dark-theme .controls,
  .dark-theme .chart-container,
  .dark-theme .analysis-panel {
    background-color: #1e293b;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  }
  
  .dark-theme .header {
    border-bottom-color: #334155;
  }
  
  .dark-theme .chart-header,
  .dark-theme .panel-header {
    border-bottom-color: #334155;
  }
  
  .dark-theme #symbol {
    background-color: #1e293b;
    border-color: #334155;
    color: #e2e8f0;
  }
  
  .dark-theme .btn-outline {
    border-color: #475569;
    color: #e2e8f0;
  }
  
  .dark-theme .btn-outline:hover {
    background-color: #334155;
  }
  
  .dark-theme .data-card {
    background-color: #1e293b;
    border-left-color: var(--primary);
  }
  
  .dark-theme .notification {
    background-color: #1e293b;
    color: #e2e8f0;
  }
`;

// Append dark theme styles
$('<style>').text(darkThemeCSS).appendTo('head');

let fitChart = null;
let residualChart = null;
let currentResultId = null;
let currentDatasetId = null;
let isDirty = false;
let isSampleData = false;

const modelTypeLabels = {
  linear: '线性模型',
  exponential: '指数模型',
  quadratic: '二次曲线'
};

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function updateDatasetButtons() {
  const updateBtn = document.getElementById('updateDatasetBtn');
  if (currentDatasetId) {
    updateBtn.style.display = 'block';
    if (isDirty) {
      updateBtn.textContent = '💾 更新当前数据集 *';
    } else {
      updateBtn.textContent = '💾 更新当前数据集';
    }
  } else {
    updateBtn.style.display = 'none';
  }
}

function markDirty() {
  isDirty = true;
  isSampleData = false;
  updateDatasetButtons();
}

function clearDirty() {
  isDirty = false;
  updateDatasetButtons();
}

function initCharts() {
  const fitCtx = document.getElementById('fitChart').getContext('2d');
  const residualCtx = document.getElementById('residualChart').getContext('2d');

  fitChart = new Chart(fitCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '原始数据',
          data: [],
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          pointRadius: 7,
          pointHoverRadius: 9,
          showLine: false
        },
        {
          label: '拟合曲线',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          pointRadius: 0,
          showLine: true,
          tension: 0.1,
          fill: false
        },
        {
          label: '异常点',
          data: [],
          backgroundColor: '#f59e0b',
          borderColor: '#d97706',
          pointRadius: 9,
          pointStyle: 'triangle',
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const x = context.parsed.x?.toFixed(4) || 0;
              const y = context.parsed.y?.toFixed(4) || 0;
              return `(${x}, ${y})`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { font: { size: 12 }, color: '#64748b' },
          title: { display: true, text: 'X 轴', font: { size: 13, weight: '600' }, color: '#475569' }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { font: { size: 12 }, color: '#64748b' },
          title: { display: true, text: 'Y 轴', font: { size: 13, weight: '600' }, color: '#475569' }
        }
      }
    }
  });

  residualChart = new Chart(residualCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '残差',
          data: [],
          backgroundColor: '#8b5cf6',
          borderColor: '#8b5cf6',
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
        },
        {
          label: '零参考线',
          data: [],
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          showLine: true,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 0) {
                const x = context.parsed.x?.toFixed(4) || 0;
                const y = context.parsed.y?.toFixed(6) || 0;
                return `x=${x}, 残差=${y}`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { font: { size: 12 }, color: '#64748b' },
          title: { display: true, text: 'X 轴', font: { size: 13, weight: '600' }, color: '#475569' }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: { font: { size: 12 }, color: '#64748b' },
          title: { display: true, text: '残差 (观测值 - 预测值)', font: { size: 13, weight: '600' }, color: '#475569' }
        }
      }
    }
  });
}

function addDataRow(x = '', y = '') {
  const tbody = document.getElementById('dataTableBody');
  const rowIndex = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${rowIndex}</td>
    <td><input type="number" step="any" class="x-input" value="${x}" placeholder="X"></td>
    <td><input type="number" step="any" class="y-input" value="${y}" placeholder="Y"></td>
    <td><button class="delete-row-btn" title="删除">✕</button></td>
  `;
  tr.querySelector('.delete-row-btn').addEventListener('click', () => {
    tr.remove();
    updateRowNumbers();
    markDirty();
  });
  tr.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', markDirty);
  });
  tbody.appendChild(tr);
}

function updateRowNumbers() {
  const tbody = document.getElementById('dataTableBody');
  Array.from(tbody.children).forEach((tr, idx) => {
    tr.querySelector('td:first-child').textContent = idx + 1;
  });
}

function clearDataTable() {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    addDataRow();
  }
  currentDatasetId = null;
  currentResultId = null;
  isSampleData = false;
  clearDirty();
  resetDisplay();
}

function resetDisplay() {
  document.getElementById('metricR2').textContent = '—';
  document.getElementById('metricMSE').textContent = '—';
  document.getElementById('metricRMSE').textContent = '—';
  document.getElementById('metricMAE').textContent = '—';
  document.getElementById('eqFormula').textContent = '等待拟合...';
  document.getElementById('outliersSection').style.display = 'none';
  document.getElementById('paramsExplanationCard').style.display = 'none';

  if (fitChart) {
    fitChart.data.datasets.forEach(ds => ds.data = []);
    fitChart.update();
  }
  if (residualChart) {
    residualChart.data.datasets.forEach(ds => ds.data = []);
    residualChart.update();
  }
}

function getTableData() {
  const tbody = document.getElementById('dataTableBody');
  const points = [];
  Array.from(tbody.children).forEach(tr => {
    const xInput = tr.querySelector('.x-input');
    const yInput = tr.querySelector('.y-input');
    const x = parseFloat(xInput.value);
    const y = parseFloat(yInput.value);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  });
  return points;
}

function setTableData(points) {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';
  points.forEach(p => {
    addDataRow(p.x, p.y);
  });
}

function loadSampleData() {
  const samples = [
    { x: 1, y: 2.1 },
    { x: 2, y: 3.8 },
    { x: 3, y: 6.2 },
    { x: 4, y: 7.9 },
    { x: 5, y: 10.3 },
    { x: 6, y: 11.8 },
    { x: 7, y: 14.5 },
    { x: 8, y: 25.0 },
    { x: 9, y: 18.2 },
    { x: 10, y: 20.1 }
  ];
  setTableData(samples);
  document.getElementById('datasetName').value = '示例实验数据';
  currentDatasetId = null;
  currentResultId = null;
  isSampleData = true;
  resetDisplay();
  clearDirty();
  showToast('已加载示例数据（修改数据后将自动转为真实实验记录）', 'info');
}

async function performFit() {
  const points = getTableData();
  if (points.length < 2) {
    showToast('请至少输入2个有效数据点', 'error');
    return;
  }

  const modelType = document.querySelector('input[name="modelType"]:checked').value;
  const datasetName = document.getElementById('datasetName').value || '未命名数据集';
  const xUnit = document.getElementById('xUnit').value || '';
  const yUnit = document.getElementById('yUnit').value || '';

  if (isSampleData) {
    showToast('示例数据拟合结果不会保存到历史，请修改数据或重命名后再保存', 'info');
  }

  const fitBtn = document.getElementById('fitBtn');
  const originalText = fitBtn.textContent;
  fitBtn.textContent = '⏳ 计算中...';
  fitBtn.disabled = true;

  try {
    const res = await fetch('/api/fit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, modelType, datasetName, datasetId: currentDatasetId, xUnit, yUnit, skipHistory: isSampleData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '拟合失败');

    displayFitResult(data);
    if (!isSampleData) {
      currentResultId = data.id;
      showToast('拟合完成！', 'success');
    } else {
      currentResultId = null;
      showToast('拟合完成（示例数据未存入历史）', 'success');
    }
    loadHistory();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    fitBtn.textContent = originalText;
    fitBtn.disabled = false;
  }
}

function displayFitResult(result) {
  document.getElementById('metricR2').textContent = result.metrics.rSquared.toFixed(6);
  document.getElementById('metricMSE').textContent = result.metrics.mse.toFixed(6);
  document.getElementById('metricRMSE').textContent = result.metrics.rmse.toFixed(6);
  document.getElementById('metricMAE').textContent = result.metrics.mae.toFixed(6);
  document.getElementById('eqFormula').textContent = result.modelEquation;

  if (result.xUnit !== undefined && result.xUnit !== '') {
    document.getElementById('xUnit').value = result.xUnit;
  }
  if (result.yUnit !== undefined && result.yUnit !== '') {
    document.getElementById('yUnit').value = result.yUnit;
  }

  if (result.xUnit || result.yUnit) {
    fitChart.options.scales.x.title.text = `X 轴 (${result.xUnit || '无单位'})`;
    fitChart.options.scales.y.title.text = `Y 轴 (${result.yUnit || '无单位'})`;
    fitChart.update();
  }

  const explanationCard = generateParamsExplanationCard(result);
  const cardEl = document.getElementById('paramsExplanationCard');
  cardEl.innerHTML = explanationCard;
  cardEl.style.display = 'block';

  const normalPoints = [];
  const outlierPoints = [];
  const outlierIndices = new Set(result.outliers.filter(o => o.isOutlier).map(o => o.index));

  result.points.forEach((p, i) => {
    if (outlierIndices.has(i)) {
      outlierPoints.push(p);
    } else {
      normalPoints.push(p);
    }
  });

  fitChart.data.datasets[0].data = normalPoints;
  fitChart.data.datasets[1].data = result.curvePoints;
  fitChart.data.datasets[2].data = outlierPoints;
  fitChart.update();

  const residualData = result.points.map((p, i) => ({
    x: p.x,
    y: result.residuals[i]
  }));

  const xs = result.points.map(p => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const range = maxX - minX || 1;
  const zeroLine = [
    { x: minX - range * 0.1, y: 0 },
    { x: maxX + range * 0.1, y: 0 }
  ];

  residualChart.data.datasets[0].data = residualData;
  residualChart.data.datasets[1].data = zeroLine;
  residualChart.update();

  const outliersSection = document.getElementById('outliersSection');
  const outliersList = document.getElementById('outliersList');
  const actualOutliers = result.outliers.filter(o => o.isOutlier);

  if (actualOutliers.length > 0) {
    outliersSection.style.display = 'block';
    outliersList.innerHTML = actualOutliers.map(o => `
      <span class="outlier-badge">
        #${o.index + 1} (x=${result.points[o.index].x.toFixed(3)}, y=${result.points[o.index].y.toFixed(3)})
        Z=${o.zScore.toFixed(2)}
      </span>
    `).join('');
  } else {
    outliersSection.style.display = 'none';
  }
}

function formatUnit(unit) {
  return unit && unit.trim() ? unit.trim() : '无量纲';
}

function getSignInfo(value, positiveDesc, negativeDesc, zeroDesc) {
  if (value > 0) {
    return `<span class="sign-positive">⬆ 正值</span>：${positiveDesc}`;
  } else if (value < 0) {
    return `<span class="sign-negative">⬇ 负值</span>：${negativeDesc}`;
  } else {
    return `<span class="sign-zero">≈ 零</span>：${zeroDesc}`;
  }
}

function generateParamsExplanationCard(result) {
  const { modelType, params, xUnit, yUnit } = result;
  const xU = formatUnit(xUnit);
  const yU = formatUnit(yUnit);

  let html = '<div class="explanation-card-inner">';
  html += '<div class="explanation-header">📖 参数说明卡</div>';

  if (modelType === 'linear') {
    const slopeUnit = xU !== '无量纲' ? `${yU}/${xU}` : yU;
    const interceptUnit = yU;
    html += `
      <div class="formula-explanation">
        <div class="formula-title">📐 公式解读</div>
        <div class="formula-big">y = a·x + b</div>
        <div class="formula-desc">
          <strong>线性模型</strong>描述了 Y 随 X 的均匀变化关系。
          每当 X 增加 1${xU === '无量纲' ? '' : ' ' + xU}，Y 就会变化 a ${slopeUnit}。
        </div>
      </div>
      <div class="params-grid">
        <div class="param-item">
          <div class="param-symbol">a (斜率)</div>
          <div class="param-value">${params.a.toFixed(6)} <span class="param-unit">${slopeUnit}</span></div>
          <div class="param-meaning">
            表示 X 每增加 1${xU === '无量纲' ? '' : ' ' + xU}，Y 的平均变化量
          </div>
          <div class="param-sign">
            ${getSignInfo(params.a,
              'Y 随 X 增大而增大（正相关、上升趋势）',
              'Y 随 X 增大而减小（负相关、下降趋势）',
              'Y 不随 X 变化（水平线）')}
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">b (截距)</div>
          <div class="param-value">${params.b.toFixed(6)} <span class="param-unit">${interceptUnit}</span></div>
          <div class="param-meaning">
            表示当 X = 0 时，Y 的预测值（曲线与 Y 轴的交点）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.b,
              '当 X=0 时，Y 的起始值为正',
              '当 X=0 时，Y 的起始值为负',
              '曲线经过坐标原点 (0, 0)')}
          </div>
        </div>
      </div>
      <div class="unit-derivation">
        <strong>🔬 单位推导：</strong>
        斜率 a = ΔY/ΔX = ${yU} / ${xU} = <span class="unit-result">${slopeUnit}</span>；
        截距 b 的量纲与 Y 相同 = <span class="unit-result">${interceptUnit}</span>
      </div>
    `;
  } else if (modelType === 'exponential') {
    const aUnit = yU;
    const bUnit = xU !== '无量纲' ? `1/${xU}` : '无量纲';
    const bDesc = Math.abs(params.b) > 1
      ? '变化较快'
      : Math.abs(params.b) > 0.1
      ? '变化适中'
      : '变化缓慢';
    html += `
      <div class="formula-explanation">
        <div class="formula-title">📐 公式解读</div>
        <div class="formula-big">y = a · eᵇˣ</div>
        <div class="formula-desc">
          <strong>指数模型</strong>描述 Y 随 X 呈指数增长或衰减的过程。
          适用于细菌繁殖、放射性衰变、复利增长等场景。
        </div>
      </div>
      <div class="params-grid">
        <div class="param-item">
          <div class="param-symbol">a (初始值)</div>
          <div class="param-value">${params.a.toFixed(6)} <span class="param-unit">${aUnit}</span></div>
          <div class="param-meaning">
            表示当 X = 0 时，Y 的初始值（Y 的起始规模）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.a,
              '初始值为正（常见情况）',
              '初始值为负（较少见）',
              '初始值为零（整个曲线恒为零）')}
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">b (增长率/衰减率)</div>
          <div class="param-value">${params.b.toFixed(6)} <span class="param-unit">${bUnit}</span></div>
          <div class="param-meaning">
            控制指数变化的速度（${bDesc}）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.b,
              '指数增长：Y 随 X 加速增大（如人口增长、复利）',
              '指数衰减：Y 随 X 加速减小（如放射性衰变、降温）',
              '无指数变化，Y 恒等于 a')}
          </div>
        </div>
      </div>
      <div class="unit-derivation">
        <strong>🔬 单位推导：</strong>
        指数 b·x 必须无量纲，故 b 的单位 = 1/X单位 = <span class="unit-result">${bUnit}</span>；
        a 的量纲与 Y 相同 = <span class="unit-result">${aUnit}</span>
      </div>
    `;
  } else if (modelType === 'quadratic') {
    const aUnit = xU !== '无量纲' ? `${yU}/${xU}²` : yU;
    const bUnit = xU !== '无量纲' ? `${yU}/${xU}` : yU;
    const cUnit = yU;
    const absA = Math.abs(params.a);
    const scale = Math.abs(params.b) + Math.abs(params.c) + 1e-6;
    const isDegenerate = absA < 1e-4 * scale || absA < 1e-8;

    if (isDegenerate) {
      const slope = params.b;
      const intercept = params.c;
      html += `
      <div class="formula-explanation">
        <div class="formula-title">📐 公式解读</div>
        <div class="formula-big">y = a·x² + b·x + c</div>
        <div class="formula-desc">
          <strong>二次曲线（抛物线）</strong>描述 Y 随 X 先增后减或先减后增的非线性关系。
          <span class="degenerate-warning">⚠ 当前二次项系数 a 极小（${params.a.toExponential(2)}），曲线已<strong>退化为近似直线</strong>，建议改用<em>线性模型</em>重新拟合。</span>
        </div>
      </div>
      <div class="degenerate-notice">
        <strong>⚠️ 退化检测：</strong>
        二次项 a 的影响可忽略，等效直线方程为 <span class="unit-result">y ≈ ${slope.toFixed(6)}x + ${intercept.toFixed(6)}</span>
        （斜率单位：${bUnit}，截距单位：${cUnit}）
      </div>
      <div class="params-grid">
        <div class="param-item">
          <div class="param-symbol">a (二次项系数)</div>
          <div class="param-value">${params.a.toFixed(6)} <span class="param-unit">${aUnit}</span></div>
          <div class="param-meaning">
            控制抛物线的开口方向和曲率大小
          </div>
          <div class="param-sign">
            <span class="sign-zero">≈ 零（退化）</span>：
            二次项几乎无影响，曲线近似为直线，顶点信息无实际意义
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">b (一次项系数 / 等效斜率)</div>
          <div class="param-value">${params.b.toFixed(6)} <span class="param-unit">${bUnit}</span></div>
          <div class="param-meaning">
            在退化情况下，等效为线性模型的斜率（X每增加1单位，Y的平均变化量）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.b,
              `等效线性斜率为正：Y 随 X 增大而增大（正相关、上升趋势），速率 ≈ ${Math.abs(params.b).toFixed(3)} ${bUnit}`,
              `等效线性斜率为负：Y 随 X 增大而减小（负相关、下降趋势），速率 ≈ ${Math.abs(params.b).toFixed(3)} ${bUnit}`,
              '等效斜率为零：Y 基本不随 X 变化（近似水平线）')}
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">c (常数项 / 等效截距)</div>
          <div class="param-value">${params.c.toFixed(6)} <span class="param-unit">${cUnit}</span></div>
          <div class="param-meaning">
            在退化情况下，等效为线性模型的截距（当 X = 0 时 Y 的预测值）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.c,
              '等效直线交 Y 轴于正半轴',
              '等效直线交 Y 轴于负半轴',
              '等效直线经过原点 (0, 0)')}
          </div>
        </div>
      </div>
      <div class="unit-derivation">
        <strong>🔬 单位推导：</strong>
        a = Y/X² = <span class="unit-result">${aUnit}</span>；
        b = Y/X = <span class="unit-result">${bUnit}</span>；
        c 与 Y 同量纲 = <span class="unit-result">${cUnit}</span>
        <br><em>（退化状态下建议采用线性模型的单位解释）</em>
      </div>
    `;
    } else {
      const vertexX = -params.b / (2 * params.a);
      const vertexY = params.c - (params.b * params.b) / (4 * params.a);
      html += `
      <div class="formula-explanation">
        <div class="formula-title">📐 公式解读</div>
        <div class="formula-big">y = a·x² + b·x + c</div>
        <div class="formula-desc">
          <strong>二次曲线（抛物线）</strong>描述 Y 随 X 先增后减或先减后增的非线性关系。
          常用于抛体运动、成本优化等场景。
        </div>
      </div>
      <div class="params-grid">
        <div class="param-item">
          <div class="param-symbol">a (二次项系数)</div>
          <div class="param-value">${params.a.toFixed(6)} <span class="param-unit">${aUnit}</span></div>
          <div class="param-meaning">
            控制抛物线的开口方向和曲率大小
          </div>
          <div class="param-sign">
            ${getSignInfo(params.a,
              '开口向上（U型），存在最小值',
              '开口向下（∩型），存在最大值',
              '退化为直线（退化为线性模型）')}
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">b (一次项系数)</div>
          <div class="param-value">${params.b.toFixed(6)} <span class="param-unit">${bUnit}</span></div>
          <div class="param-meaning">
            控制抛物线对称轴的位置（与 a 共同决定）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.b,
              `与 a 同号时对称轴在负半轴；异号时在正半轴。当前顶点 x ≈ ${vertexX.toFixed(3)}${xU === '无量纲' ? '' : ' ' + xU}`,
              `与 a 同号时对称轴在负半轴；异号时在正半轴。当前顶点 x ≈ ${vertexX.toFixed(3)}${xU === '无量纲' ? '' : ' ' + xU}`,
              `对称轴为 Y 轴 (x=0)。当前顶点 x ≈ ${vertexX.toFixed(3)}${xU === '无量纲' ? '' : ' ' + xU}`)}
          </div>
        </div>
        <div class="param-item">
          <div class="param-symbol">c (常数项/截距)</div>
          <div class="param-value">${params.c.toFixed(6)} <span class="param-unit">${cUnit}</span></div>
          <div class="param-meaning">
            当 X = 0 时 Y 的值（抛物线与 Y 轴交点）
          </div>
          <div class="param-sign">
            ${getSignInfo(params.c,
              '抛物线交 Y 轴于正半轴',
              '抛物线交 Y 轴于负半轴',
              '抛物线经过原点 (0, 0)')}
          </div>
        </div>
      </div>
      <div class="vertex-info">
        <strong>🎯 顶点信息：</strong>
        顶点坐标 ≈ (${vertexX.toFixed(3)}, ${vertexY.toFixed(3)})
        ${params.a > 0 ? '，此为<em>最小值</em>点' : params.a < 0 ? '，此为<em>最大值</em>点' : ''}
      </div>
      <div class="unit-derivation">
        <strong>🔬 单位推导：</strong>
        a = Y/X² = <span class="unit-result">${aUnit}</span>；
        b = Y/X = <span class="unit-result">${bUnit}</span>；
        c 与 Y 同量纲 = <span class="unit-result">${cUnit}</span>
      </div>
    `;
    }
  }

  html += `
    <div class="metrics-note">
      <strong>📊 误差说明：</strong>
      R²越接近1表示拟合越好；
      MSE/RMSE/MAE 单位为 ${yU}${yU !== '无量纲' ? '（或其平方）' : ''}，值越小越好。
    </div>
  `;

  html += '</div>';
  return html;
}

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const history = await res.json();
    const historyList = document.getElementById('historyList');

    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      return;
    }

    historyList.innerHTML = history.map(h => `
      <div class="history-item" data-id="${h.id}">
        <div class="history-title">${h.datasetName}</div>
        <span class="history-model">${modelTypeLabels[h.modelType] || h.modelType}</span>
        <div class="history-meta">
          <span>${h.pointsCount} 个点 · R²=${h.metrics.rSquared.toFixed(4)}</span>
          <span>${new Date(h.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="history-actions">
          <button class="btn-load" onclick="loadHistoryItem('${h.id}')">查看</button>
          <button class="btn-delete" onclick="deleteHistoryItem('${h.id}')">删除</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('加载历史失败:', err);
  }
}

async function loadHistoryItem(id) {
  try {
    const res = await fetch(`/api/history/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('datasetName').value = data.datasetName;
    document.querySelector(`input[name="modelType"][value="${data.modelType}"]`).checked = true;
    setTableData(data.points);
    displayFitResult(data);
    currentResultId = id;
    currentDatasetId = data.datasetId || null;
    isSampleData = false;
    clearDirty();
    showToast('已加载历史记录', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteHistoryItem(id) {
  if (!confirm('确定删除这条历史记录吗？')) return;
  try {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    if (currentResultId === id) {
      currentResultId = null;
    }
    showToast('已删除', 'success');
    loadHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDatasets() {
  try {
    const res = await fetch('/api/datasets');
    const datasets = await res.json();
    const datasetsList = document.getElementById('datasetsList');

    if (datasets.length === 0) {
      datasetsList.innerHTML = '<div class="empty-state">暂无保存的数据集</div>';
      return;
    }

    datasetsList.innerHTML = datasets.map(d => `
      <div class="dataset-item" data-id="${d.id}">
        <div class="history-title">${d.name}</div>
        <div class="history-meta">
          <span>${d.points.length} 个点</span>
          <span>${new Date(d.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="history-actions">
          <button class="btn-load" onclick="loadDataset('${d.id}')">加载</button>
          <button class="btn-delete" onclick="deleteDataset('${d.id}')">删除</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('加载数据集失败:', err);
  }
}

async function saveCurrentDataset() {
  const points = getTableData();
  const name = document.getElementById('datasetName').value || '未命名数据集';

  if (points.length < 2) {
    showToast('请至少输入2个有效数据点', 'error');
    return;
  }

  try {
    const res = await fetch('/api/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, points })
    });
    if (!res.ok) throw new Error('保存失败');
    const dataset = await res.json();
    currentDatasetId = dataset.id;
    clearDirty();
    showToast('已另存为新数据集', 'success');
    loadDatasets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateCurrentDataset() {
  if (!currentDatasetId) {
    showToast('没有可更新的数据集，请先加载或另存为', 'error');
    return;
  }

  const points = getTableData();
  const name = document.getElementById('datasetName').value || '未命名数据集';

  if (points.length < 2) {
    showToast('请至少输入2个有效数据点', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/datasets/${currentDatasetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, points })
    });
    if (!res.ok) throw new Error('更新失败');
    clearDirty();
    showToast('数据集已更新', 'success');
    loadDatasets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDataset(id) {
  try {
    const res = await fetch('/api/datasets');
    const datasets = await res.json();
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) throw new Error('数据集不存在');

    document.getElementById('datasetName').value = dataset.name;
    setTableData(dataset.points);
    currentDatasetId = id;
    currentResultId = null;
    isSampleData = false;
    resetDisplay();
    clearDirty();
    showToast('已加载数据集', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDataset(id) {
  if (!confirm('确定删除这个数据集吗？')) return;
  try {
    const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    if (currentDatasetId === id) {
      currentDatasetId = null;
      updateDatasetButtons();
    }
    showToast('已删除', 'success');
    loadDatasets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.getElementById('tab-history').style.display = tab === 'history' ? 'block' : 'none';
      document.getElementById('tab-datasets').style.display = tab === 'datasets' ? 'block' : 'none';
    });
  });
}

function initEventListeners() {
  document.getElementById('addRowBtn').addEventListener('click', () => {
    addDataRow();
    markDirty();
  });
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('确定清空所有数据吗？')) clearDataTable();
  });
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
  document.getElementById('fitBtn').addEventListener('click', performFit);
  document.getElementById('saveDatasetBtn').addEventListener('click', saveCurrentDataset);
  document.getElementById('updateDatasetBtn').addEventListener('click', updateCurrentDataset);
  document.getElementById('datasetName').addEventListener('input', markDirty);
  document.getElementById('xUnit').addEventListener('input', markDirty);
  document.getElementById('yUnit').addEventListener('input', markDirty);
  document.querySelectorAll('input[name="modelType"]').forEach(radio => {
    radio.addEventListener('change', markDirty);
  });
}

function init() {
  initCharts();
  initTabs();
  initEventListeners();
  clearDataTable();
  loadHistory();
  loadDatasets();
  updateDatasetButtons();
}

document.addEventListener('DOMContentLoaded', init);

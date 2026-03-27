/**
 * NEUROWELL — pdf.js
 * AI Health Report Generator (using jsPDF)
 * Generates weekly PDF health reports
 */

const PDFReporter = {

  async generate(email) {
    // Load jsPDF dynamically if not present
    if (!window.jspdf) {
      await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const user = DB.getUser(email);
    const logs = DB.getLogs(email, 7);
    const avgs = DB.getWeeklyAverages(email);
    const score = DB.computeHealthScore(logs);
    const insight = PatternEngine.generateWeeklyInsight(email);
    const alerts  = PatternEngine.analyze(logs);

    const W = 210; // A4 width mm
    let y = 20;
    const margin = 18;
    const lineH  = 7;

    // ── Helper functions ──
    const cyan     = [0, 229, 255];
    const green    = [57, 255, 143];
    const amber    = [255, 171, 0];
    const red      = [255, 61, 107];
    const dark     = [7, 13, 26];
    const text     = [232, 244, 248];
    const muted    = [74, 109, 132];

    function setColor(arr, alpha = 1) {
      doc.setTextColor(arr[0], arr[1], arr[2]);
    }
    function drawRect(x, fy, w, h, fillArr, borderArr) {
      if (fillArr) { doc.setFillColor(fillArr[0], fillArr[1], fillArr[2]); doc.rect(x,fy,w,h,'F'); }
      if (borderArr) { doc.setDrawColor(borderArr[0], borderArr[1], borderArr[2]); doc.rect(x,fy,w,h,'S'); }
    }
    function addSection(title) {
      y += 4;
      doc.setFontSize(11);
      doc.setFont('helvetica','bold');
      setColor(cyan);
      doc.text(title.toUpperCase(), margin, y);
      doc.setDrawColor(0, 229, 255);
      doc.setLineWidth(0.4);
      doc.line(margin, y+1, W-margin, y+1);
      y += 8;
    }
    function addKV(key, val, valColor) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica','normal');
      setColor(muted);
      doc.text(key + ':', margin+2, y);
      doc.setFont('helvetica','bold');
      if (valColor) setColor(valColor); else setColor(text);
      doc.text(String(val), margin + 60, y);
      y += lineH;
    }

    /* ── COVER HEADER ── */
    drawRect(0, 0, W, 48, dark);
    doc.setFontSize(28);
    doc.setFont('helvetica','bold');
    setColor(cyan);
    doc.text('NEUROWELL', margin, 22);
    doc.setFontSize(11);
    doc.setFont('helvetica','normal');
    setColor(muted);
    doc.text('AI Personal Health Intelligence Report', margin, 30);
    doc.setFontSize(9);
    setColor(muted);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`, margin, 38);
    doc.text(`Patient: ${user?.name || 'Unknown'}  |  Email: ${email}`, margin, 44);
    y = 58;

    /* ── HEALTH SCORE ── */
    addSection('Weekly Health Score');
    const scoreColor = score >= 75 ? green : score >= 50 ? amber : red;
    drawRect(margin, y-4, W - margin*2, 22, [17, 30, 53]);
    doc.setFontSize(36);
    doc.setFont('helvetica','bold');
    setColor(scoreColor);
    doc.text(String(score), margin+8, y+10);
    doc.setFontSize(10);
    setColor(muted);
    doc.text('/100', margin+28, y+10);
    doc.setFontSize(11);
    doc.setFont('helvetica','normal');
    setColor(text);
    doc.text(insight.summary, margin+50, y+6);
    y += 26;

    /* ── WEEKLY AVERAGES ── */
    addSection('Weekly Averages');
    const metricsData = [
      { label: 'Sleep',     val: `${avgs.sleep}h / night`,  color: avgs.sleep  >= 7 ? green : red },
      { label: 'Water',     val: `${avgs.water} glasses`,   color: avgs.water  >= 8 ? green : amber },
      { label: 'Activity',  val: `${avgs.activity} mins`,   color: avgs.activity >= 30 ? green : amber },
      { label: 'Stress',    val: `${avgs.stress}/10`,        color: avgs.stress  <= 5 ? green : red },
      { label: 'Mood',      val: `${avgs.mood}/10`,          color: avgs.mood    >= 6 ? green : amber },
    ];
    metricsData.forEach(m => addKV(m.label, m.val, m.color));
    y += 4;

    /* ── DAILY LOG TABLE ── */
    addSection('Daily Log (Last 7 Days)');
    const cols  = ['Date','Sleep','Water','Activity','Stress','Mood','Symptoms'];
    const colW  = [28, 18, 16, 20, 16, 14, 52];
    let cx = margin;
    // Header row
    drawRect(margin, y-4, W-margin*2, 8, [13, 22, 45]);
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    setColor(cyan);
    cols.forEach((c, i) => { doc.text(c, cx+2, y); cx += colW[i]; });
    y += 7;

    // Data rows
    doc.setFont('helvetica','normal');
    logs.slice(0,7).forEach((log, idx) => {
      if (idx % 2 === 0) drawRect(margin, y-3.5, W-margin*2, 7, [11, 18, 35]);
      cx = margin;
      setColor(text);
      doc.setFontSize(8);
      const row = [
        log.date,
        log.sleep + 'h',
        log.water + ' gl',
        log.activity + ' min',
        log.stress + '/10',
        log.mood + '/10',
        (log.symptoms||[]).join(', ') || '—'
      ];
      row.forEach((cell, i) => {
        doc.text(String(cell).substring(0, 18), cx+2, y+0.5);
        cx += colW[i];
      });
      y += 7;
    });
    y += 4;

    /* ── PATTERN ALERTS ── */
    if (alerts.length > 0) {
      addSection('Detected Patterns & Alerts');
      alerts.forEach(a => {
        const lvlColor = a.level==='danger'?red : a.level==='success'?green : amber;
        drawRect(margin, y-3, W-margin*2, 10, [13,22,45]);
        doc.setDrawColor(lvlColor[0], lvlColor[1], lvlColor[2]);
        doc.setLineWidth(0.6);
        doc.line(margin, y-3, margin, y+7);
        setColor(lvlColor);
        doc.setFontSize(9);
        doc.setFont('helvetica','bold');
        doc.text(`${a.emoji} ${a.name}`, margin+4, y+1.5);
        setColor(text);
        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        const wrapped = doc.splitTextToSize(a.message, W-margin*2-10);
        doc.text(wrapped[0], margin+4, y+6.5);
        y += 14;
      });
    }

    /* ── RECOMMENDATIONS ── */
    if (insight.tips.length > 0) {
      addSection('AI Recommendations');
      insight.tips.forEach((tip, i) => {
        setColor(text);
        doc.setFontSize(9);
        doc.setFont('helvetica','normal');
        doc.text(`${i+1}. ${tip}`, margin+4, y);
        y += lineH;
      });
    }

    /* ── FOOTER ── */
    y = 285;
    doc.setFontSize(7.5);
    setColor(muted);
    doc.text('NeuroWell AI – This report is for informational purposes only. Consult a healthcare professional for medical advice.', margin, y, { maxWidth: W-margin*2 });
    doc.setDrawColor(muted[0], muted[1], muted[2]);
    doc.line(margin, y-3, W-margin, y-3);

    /* ── SAVE ── */
    const filename = `NeuroWell_Report_${email.split('@')[0]}_${DateUtils.today()}.pdf`;
    doc.save(filename);
    showToast(`Report downloaded: ${filename}`, 'success', 4000);
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
};

window.PDFReporter = PDFReporter;

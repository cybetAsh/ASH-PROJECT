<!-- this file will be included inline in pages that need it; below are helper functions -->
<script>
/* Helper: copy text */
function copyToClipboard(text){
  navigator.clipboard?.writeText(text).then(()=>alert('Copied!')).catch(()=>prompt('Copy this:', text));
}

/* Catalogue page: upload + request slice */
async function handleCatalogueUpload(formEl, resultEl) {
  const fileInput = formEl.querySelector('input[type=file]');
  if (!fileInput.files.length) { alert('Choose photo'); return; }
  const fd = new FormData();
  fd.append('photo', fileInput.files[0]);

  const btn = formEl.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Uploading...';

  const resp = await fetch('/api/upload-and-slice', { method:'POST', body:fd });
  const json = await resp.json();
  btn.disabled = false; btn.textContent = 'Create Catalogue';
  if (!json.success) { alert('Upload failed'); return; }

  // Show original preview + slices + download links
  resultEl.innerHTML = `<p class="small-muted">Uploaded — preview below</p>
    <img class="preview-img" src="${json.original}" alt="preview"> 
    <div class="slice-grid"></div>`;

  const grid = resultEl.querySelector('.slice-grid');
  json.slices.forEach((u, idx) => {
    const div = document.createElement('div');
    div.className = 'slice-item card';
    div.innerHTML = `<div>Part ${idx+1}</div>
      <img src="${u}" style="max-width:100%;margin:10px 0;border-radius:6px">
      <a href="${u}" download="slice_${idx+1}.png" class="copy-btn">Download</a>`;
    grid.appendChild(div);
  });
}

/* WP link gen page */
function generateWhatsAppLink(inputEl, outEl) {
  const raw = inputEl.value.trim();
  if (!raw) { alert('Enter number'); return; }
  // ensure leading + or digits
  let number = raw.replace(/\s+/g,'');
  // allow if starts with + , otherwise if user typed number without +94, we assume they included country code
  // Build wa.me link: https://wa.me/<full-number-without-plus>?text=...
  const plain = number.startsWith('+') ? number.slice(1) : number;
  const link = `https://wa.me/${plain}`;
  outEl.innerHTML = `<div><a href="${link}" target="_blank">${link}</a></div>
    <div style="margin-top:8px"><button class="copy-btn" onclick="copyToClipboard('${link}')">Copy Link</button></div>`;
}

/* WP QR gen page: uses server /api/qrcode */
async function generateQrFromNumber(inputEl, outEl) {
  const num = inputEl.value.trim();
  if (!num) { alert('Enter number'); return; }
  const plain = num.startsWith('+') ? num.slice(1) : num;
  const text = `https://wa.me/${plain}`;
  outEl.innerHTML = 'Generating...';
  const res = await fetch('/api/qrcode', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
  const j = await res.json();
  if (!j.success) { outEl.innerHTML = 'Failed'; return; }
  outEl.innerHTML = `<img src="${j.dataUrl}" alt="qr" style="max-width:240px;border-radius:8px"><div style="margin-top:8px"><button class="copy-btn" onclick="copyToClipboard('${text}')">Copy Link</button></div>`;
}
</script>
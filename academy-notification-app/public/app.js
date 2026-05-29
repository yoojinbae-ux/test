document.addEventListener('DOMContentLoaded', () => {
  // --- App State ---
  let students = [];
  let selectedIds = new Set();
  let templates = [];
  
  // Search & Filter State
  let searchQuery = '김';
  let activeTab = 'active-students';
  let fastSchoolFilter = '';
  let fastGradeFilter = '';
  
  // Target Settings
  let targetStudent = true;
  let targetGuardian = true;
  let targetType = 'both'; // both, student, guardian
  let selectedOnlyFilter = false;
  
  // Message Editor State
  let messageTitle = '';
  let messageContent = '';
  let alertType = '일반';
  let previewActive = false;
  let previewIndex = 0;
  
  // Settings States
  let hadaServiceEnabled = true;
  let smsServiceEnabled = true;

  // --- DOM Elements ---
  // Header
  const btnLayoutReset = document.getElementById('btn-layout-reset');
  const branchSelector = document.getElementById('branch-selector');

  // Left Panel
  const tabButtons = document.querySelectorAll('.tab-item');
  const studentSearchInput = document.getElementById('student-search-input');
  const btnSearch = document.getElementById('btn-search');
  const checkAllSearch = document.getElementById('check-all-search');
  const studentSearchList = document.getElementById('student-search-list');
  const searchSelectedCount = document.getElementById('search-selected-count');
  const btnClearSelection = document.getElementById('btn-clear-selection');
  const btnAccumulate = document.getElementById('btn-accumulate');
  const btnAddNew = document.getElementById('btn-add-new');

  // Center Panel
  const selectFastSchool = document.getElementById('select-fast-school');
  const selectFastGrade = document.getElementById('select-fast-grade');
  const chkTargetStudent = document.getElementById('target-student');
  const chkTargetGuardian = document.getElementById('target-guardian');
  const selectTargetType = document.getElementById('select-target-type');
  const toggleSelectedOnly = document.getElementById('toggle-selected-only');
  const checkAllSelected = document.getElementById('check-all-selected');
  const selectedStudentsList = document.getElementById('selected-students-list');
  
  // Center Bottom Summary
  const summaryStudentsCount = document.getElementById('summary-students-count');
  const summarySmsCount = document.getElementById('summary-sms-count');
  const summaryPushCount = document.getElementById('summary-push-count');

  // Right-Center Panel (Creator)
  const selectTemplate = document.getElementById('select-template');
  const selectAlertType = document.getElementById('select-alert-type');
  const btnClearFields = document.getElementById('btn-clear-fields');
  const inputAlertTitle = document.getElementById('input-alert-title');
  const textareaAlertContent = document.getElementById('textarea-alert-content');
  const lblByteCount = document.getElementById('lbl-byte-count');
  const badgeLmsConversion = document.getElementById('badge-lms-conversion');
  const lblTotalLimit = document.getElementById('lbl-total-limit');
  const togglePreview = document.getElementById('toggle-preview');
  
  // Preview bubble
  const previewBubble = document.getElementById('preview-bubble');
  const previewRecipientIndicator = document.getElementById('preview-recipient-indicator');
  const previewTextTitle = document.getElementById('preview-text-title');
  const previewTextContent = document.getElementById('preview-text-content');
  const previewIndexIndicator = document.getElementById('preview-index-indicator');
  const btnPreviewPrev = document.getElementById('btn-preview-prev');
  const btnPreviewNext = document.getElementById('btn-preview-next');

  // Right Panel (Settings)
  const toggleHadaService = document.getElementById('toggle-hada-service');
  const statusHada = document.getElementById('status-hada');
  const bodyHadaSettings = document.getElementById('body-hada-settings');
  const chkHadaPush = document.getElementById('chk-hada-push');
  const selectHadaChannel = document.getElementById('select-hada-channel');
  
  const inputHadaTestId = document.getElementById('input-hada-test-id');
  const btnHadaTestSend = document.getElementById('btn-hada-test-send');

  const toggleSmsService = document.getElementById('toggle-sms-service');
  const statusSms = document.getElementById('status-sms');
  const bodySmsSettings = document.getElementById('body-sms-settings');
  const selectSmsNumber = document.getElementById('select-sms-number');
  
  const inputSmsTestNumber = document.getElementById('input-sms-test-number');
  const btnSmsTestSend = document.getElementById('btn-sms-test-send');

  // Right Panel Bottom
  const summaryRecipientsHada = document.getElementById('summary-recipients-hada');
  const summaryRecipientsSms = document.getElementById('summary-recipients-sms');
  const validationWarningMsg = document.getElementById('validation-warning-msg');
  const btnSendMessage = document.getElementById('btn-send-message');

  // Modal Simulator
  const modalSendSimulator = document.getElementById('modal-send-simulator');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatusText = document.getElementById('progress-status-text');
  const simulationLog = document.getElementById('simulation-log');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // --- Initialization & API Fetch ---
  async function initApp() {
    try {
      // 1. Fetch Students
      const resStudents = await fetch('/api/students');
      students = await resStudents.json();

      // Set initial selected ids based on students default data
      students.forEach(s => {
        if (s.checked) {
          selectedIds.add(s.id);
        }
      });

      // 2. Fetch Templates
      const resTemplates = await fetch('/api/templates');
      templates = await resTemplates.json();

      // Populate UI Dropdowns
      populateFilters();
      populateTemplateDropdown();
      
      // Update Title & Content variables
      messageTitle = inputAlertTitle.value;
      messageContent = textareaAlertContent.value;
      
      // Initial Render
      updateUI();
    } catch (err) {
      showToast('데이터를 로드하는 중 오류가 발생했습니다.', 'error');
      console.error(err);
    }
  }

  // Populate filter options dynamically
  function populateFilters() {
    const schools = new Set();
    const grades = new Set();

    students.forEach(s => {
      if (s.school && s.school !== '-') schools.add(s.school);
      if (s.grade && s.grade !== '-') grades.add(s.grade);
    });

    // Populate school dropdown
    selectFastSchool.innerHTML = '<option value="">학교를 선택합니다.</option>';
    Array.from(schools).sort().forEach(school => {
      selectFastSchool.innerHTML += `<option value="${school}">${school}</option>`;
    });

    // Populate grade dropdown
    selectFastGrade.innerHTML = '<option value="">학년을 선택합니다.</option>';
    Array.from(grades).sort().forEach(grade => {
      selectFastGrade.innerHTML += `<option value="${grade}">${grade}</option>`;
    });
  }

  // Populate template options
  function populateTemplateDropdown() {
    selectTemplate.innerHTML = '<option value="">알림 템플릿을 선택합니다.</option>';
    templates.forEach(t => {
      selectTemplate.innerHTML += `<option value="${t.id}">${t.title}</option>`;
    });
  }

  // --- Byte Counter Logic ---
  // Count bytes: English/Numbers = 1 byte, Korean/Special characters = 2 bytes
  function calculateBytes(str) {
    let byteCount = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode <= 127) {
        byteCount += 1;
      } else {
        byteCount += 2;
      }
    }
    return byteCount;
  }

  function handleByteCounting() {
    const text = textareaAlertContent.value;
    const bytes = calculateBytes(text);
    
    lblByteCount.textContent = `${bytes} byte`;
    lblTotalLimit.textContent = `${bytes}/2000 byte`;

    if (bytes > 90) {
      badgeLmsConversion.classList.remove('hidden');
    } else {
      badgeLmsConversion.classList.add('hidden');
    }
  }

  // --- Rendering Functions ---

  function updateUI() {
    renderSearchList();
    renderSelectedList();
    updateSummaryStats();
    updateValidationState();
    updatePreviewBubble();
  }

  // Render left panel (search result)
  function renderSearchList() {
    studentSearchList.innerHTML = '';
    
    // Filter logic
    let filtered = students;
    
    // Tab filtering (mock concept: all vs active)
    if (activeTab === 'active-students') {
      // In a real database we would filter by active registration status. 
      // For mock, we show all students since they are all registered.
    }
    
    if (searchQuery) {
      filtered = filtered.filter(s => s.name.includes(searchQuery));
    }

    if (filtered.length === 0) {
      studentSearchList.innerHTML = `<tr><td colspan="3" class="text-muted" style="text-align: center; padding: 20px;">검색 결과가 없습니다.</td></tr>`;
      checkAllSearch.checked = false;
      return;
    }

    let allChecked = true;
    filtered.forEach(s => {
      const isChecked = selectedIds.has(s.id);
      if (!isChecked) allChecked = false;
      
      const tr = document.createElement('tr');
      if (isChecked) {
        tr.classList.add('selected');
        // Let's highlight '김예호' by default if it's the search screen active select
        if (s.name === '김예호') {
          tr.classList.add('highlighted');
        }
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="chk-student-search" data-id="${s.id}" ${isChecked ? 'checked' : ''}></td>
        <td class="font-bold">${s.name}</td>
        <td class="text-muted">${s.school !== '-' ? `${s.school}/${s.grade}` : '-'}</td>
      `;

      // Row click handler (clicks checkbox)
      tr.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const checkbox = tr.querySelector('.chk-student-search');
          checkbox.checked = !checkbox.checked;
          handleSearchCheckboxChange(s.id, checkbox.checked);
        }
      });

      // Checkbox direct handler
      const checkbox = tr.querySelector('.chk-student-search');
      checkbox.addEventListener('change', (e) => {
        handleSearchCheckboxChange(s.id, e.target.checked);
      });

      studentSearchList.appendChild(tr);
    });

    checkAllSearch.checked = allChecked;
    searchSelectedCount.textContent = selectedIds.size;
  }

  // Handle checking/unchecking a student from the left panel
  function handleSearchCheckboxChange(studentId, isChecked) {
    if (isChecked) {
      selectedIds.add(studentId);
    } else {
      selectedIds.delete(studentId);
    }
    // Update checked state in the source dataset
    const student = students.find(s => s.id === studentId);
    if (student) student.checked = isChecked;

    updateUI();
  }

  // Render middle panel (selected list)
  function renderSelectedList() {
    selectedStudentsList.innerHTML = '';
    
    // Filter students currently in selectedIds
    let selectedList = students.filter(s => selectedIds.has(s.id));
    
    // Apply "학교 빠른 선택" filter
    if (fastSchoolFilter) {
      selectedList = selectedList.filter(s => s.school === fastSchoolFilter);
    }
    // Apply "학년 빠른 선택" filter
    if (fastGradeFilter) {
      selectedList = selectedList.filter(s => s.grade === fastGradeFilter);
    }

    // Apply "선택된 수강생만 보기" toggle
    // Wait, "선택된 수강생만 보기" in this Hagwon dashboard context means 
    // it filters the grid to show only items that are checked in the MIDDLE list itself.
    // If it's unchecked, we render all students in selectedIds.
    // Let's implement checking inside the middle list. By default, when a student is added 
    // to selectedIds, they are checked.
    if (selectedOnlyFilter) {
      selectedList = selectedList.filter(s => s.checked);
    }

    if (selectedList.length === 0) {
      selectedStudentsList.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 20px;">재원생 목록이 비어 있습니다. 왼쪽에서 선택하세요.</td></tr>`;
      checkAllSelected.checked = false;
      return;
    }

    let allChecked = true;
    selectedList.forEach(s => {
      if (!s.checked) allChecked = false;
      
      const tr = document.createElement('tr');
      if (s.checked) tr.classList.add('selected');

      // Receivers count link
      const phoneLink = `<span class="link-btn font-bold" data-id="${s.id}">${s.phoneCount}개</span>`;

      tr.innerHTML = `
        <td><input type="checkbox" class="chk-student-selected" data-id="${s.id}" ${s.checked ? 'checked' : ''}></td>
        <td class="font-bold">${s.name}</td>
        <td>${s.school !== '-' ? `${s.school} ${s.grade}` : '-'}</td>
        <td>${s.class}</td>
        <td>${s.division}</td>
        <td>${phoneLink}</td>
        <td>${s.hadaInfo}</td>
      `;

      // Click event for row check
      tr.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('link-btn')) {
          const checkbox = tr.querySelector('.chk-student-selected');
          checkbox.checked = !checkbox.checked;
          handleMiddleCheckboxChange(s.id, checkbox.checked);
        }
      });

      // Checkbox direct handler
      const checkbox = tr.querySelector('.chk-student-selected');
      checkbox.addEventListener('change', (e) => {
        handleMiddleCheckboxChange(s.id, e.target.checked);
      });

      // Phone count click (mock popover/toast)
      const phoneCountBtn = tr.querySelector('.link-btn');
      phoneCountBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast(`${s.name} 학생의 등록 연락처: [학부모] 010-XXXX-XXXX`, 'info');
      });

      selectedStudentsList.appendChild(tr);
    });

    checkAllSelected.checked = allChecked;
  }

  function handleMiddleCheckboxChange(studentId, isChecked) {
    const student = students.find(s => s.id === studentId);
    if (student) {
      student.checked = isChecked;
    }
    updateUI();
  }

  // Update footer statistics
  function updateSummaryStats() {
    // Current checked items in middle list
    const activeSelectedList = students.filter(s => selectedIds.has(s.id) && s.checked);
    const selectedCount = activeSelectedList.length;

    // HADA recipients calculations
    // If HADA service is active, but students have "-" for hadaInfo, they cannot receive push.
    // In our mock data, they all have hadaInfo = "-" except maybe some. Let's look at counts:
    // If toggle is enabled, how many have active HADA account linked? 0.
    // So HADA pushes: 0 students, 0 guardians.
    let hadaStudentCount = 0;
    let hadaGuardianCount = 0;
    
    // In a real setting, if they have HADA account linked:
    // For mock demonstration, let's keep it 0명·0명 as in the screenshot if they have '-' HADA info.
    activeSelectedList.forEach(s => {
      if (s.hadaInfo !== '-') {
        if (targetType === 'both' || targetType === 'student') hadaStudentCount++;
        if (targetType === 'both' || targetType === 'guardian') hadaGuardianCount++;
      }
    });

    // SMS recipients calculation (fallback when HADA fails or SMS is forced)
    // Screenshot shows SMS: 0명·3명 (since 3 students are selected, and we target Guardians)
    // Let's implement: guardians have phone numbers (phoneCount = 1). Students do not.
    // SMS Student Count = 0. SMS Guardian Count = Selected Count (if targeting Guardian).
    let smsStudentCount = 0;
    let smsGuardianCount = 0;

    if (smsServiceEnabled) {
      activeSelectedList.forEach(s => {
        // If targeting Student
        if (targetType === 'student' || targetType === 'both') {
          // Mock logic: 10% of students have their own phone number registered
          if (s.id % 5 === 0) smsStudentCount++;
        }
        // If targeting Guardian
        if (targetType === 'guardian' || targetType === 'both') {
          smsGuardianCount++; // Guardians always have a phone registered (1개)
        }
      });
    }

    // Set numbers in UI
    summaryStudentsCount.textContent = selectedCount;
    
    // Total scheduled counts (SMS + Push)
    // Scheduled Push: If HADA is enabled and recipients have HADA app.
    // Scheduled SMS: If SMS is enabled, and (HADA is disabled OR students don't have HADA so it falls back).
    // In screenshot: "발송 예정 문자 개수 : 3 | 발송 예정 알림 개수 : 0"
    // Since HADA pushes is 0, all 3 fallback to SMS.
    summarySmsCount.textContent = smsStudentCount + smsGuardianCount;
    summaryPushCount.textContent = hadaStudentCount + hadaGuardianCount;

    summaryRecipientsHada.textContent = `${hadaStudentCount}명·${hadaGuardianCount}명`;
    summaryRecipientsSms.textContent = `${smsStudentCount}명·${smsGuardianCount}명`;
  }

  // Enable/Disable Send button & toggle validation warning
  function updateValidationState() {
    messageTitle = inputAlertTitle.value.trim();
    const messageBody = textareaAlertContent.value.trim();
    const activeSelectedList = students.filter(s => selectedIds.has(s.id) && s.checked);

    let isValid = true;
    let warningMsg = '';

    if (!messageTitle) {
      isValid = false;
      warningMsg = '알림명을 입력해 주세요';
    } else if (!messageBody) {
      isValid = false;
      warningMsg = '알림내용을 입력해 주세요';
    } else if (activeSelectedList.length === 0) {
      isValid = false;
      warningMsg = '수신 대상을 선택해 주세요';
    } else if (!hadaServiceEnabled && !smsServiceEnabled) {
      isValid = false;
      warningMsg = '발송 채널을 활성화해 주세요';
    }

    if (isValid) {
      validationWarningMsg.classList.add('hidden');
      btnSendMessage.removeAttribute('disabled');
      btnSendMessage.style.opacity = '1';
    } else {
      validationWarningMsg.textContent = warningMsg;
      validationWarningMsg.classList.remove('hidden');
      btnSendMessage.setAttribute('disabled', 'true');
      btnSendMessage.style.opacity = '0.7';
    }
  }

  // --- Preview Dialog Logic ---
  function updatePreviewBubble() {
    if (!previewActive) {
      previewBubble.classList.add('hidden');
      return;
    }

    const activeSelectedList = students.filter(s => selectedIds.has(s.id) && s.checked);
    
    if (activeSelectedList.length === 0) {
      previewBubble.classList.remove('hidden');
      previewRecipientIndicator.textContent = '수신 대상 없음';
      previewTextTitle.textContent = messageTitle || '알림 제목';
      previewTextContent.textContent = '선택된 재원생이 없어 미리보기를 구성할 수 없습니다.';
      previewIndexIndicator.textContent = '0 / 0';
      return;
    }

    // Safety check on index
    if (previewIndex >= activeSelectedList.length) {
      previewIndex = 0;
    } else if (previewIndex < 0) {
      previewIndex = activeSelectedList.length - 1;
    }

    previewBubble.classList.remove('hidden');
    
    const targetStudent = activeSelectedList[previewIndex];
    previewRecipientIndicator.textContent = `${targetStudent.name} 학생 수신화면`;
    
    // Replace placeholders: %% -> Student Name
    let formattedContent = textareaAlertContent.value || '알림 내용이 여기에 표시됩니다.';
    formattedContent = formattedContent.replace(/%%/g, `<strong style="color:var(--secondary);">${targetStudent.name}</strong>`);
    
    previewTextTitle.textContent = messageTitle || '알림 제목 없음';
    previewTextContent.innerHTML = formattedContent;
    previewIndexIndicator.textContent = `${previewIndex + 1} / ${activeSelectedList.length}`;
  }

  // --- Event Listeners setup ---

  // Layout reset mock action
  btnLayoutReset.addEventListener('click', () => {
    // Reset filters
    selectFastSchool.value = '';
    selectFastGrade.value = '';
    fastSchoolFilter = '';
    fastGradeFilter = '';
    
    // Reset checkboxes
    chkTargetStudent.checked = true;
    chkTargetGuardian.checked = true;
    selectTargetType.value = 'both';
    targetType = 'both';
    
    // Reset toggle
    toggleSelectedOnly.checked = false;
    selectedOnlyFilter = false;
    
    // Reset inputs
    inputAlertTitle.value = '';
    textareaAlertContent.value = '';
    selectTemplate.value = '';
    selectAlertType.value = '일반';
    
    // Reset switches
    toggleHadaService.checked = true;
    toggleSmsService.checked = true;
    hadaServiceEnabled = true;
    smsServiceEnabled = true;

    // Reset selected students to original screenshot state (김예준, 김건아, 김예호)
    selectedIds.clear();
    students.forEach(s => {
      if (s.name === '김예준' || s.name === '김건아' || s.name === '김예호' || s.name === '김재준') {
        s.checked = true;
        selectedIds.add(s.id);
      } else {
        s.checked = false;
      }
    });

    handleByteCounting();
    updateUI();
    showToast('레이아웃과 상태가 초기화되었습니다.', 'info');
  });

  // Left Panel tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      renderSearchList();
    });
  });

  // Search input typing
  studentSearchInput.addEventListener('keyup', (e) => {
    searchQuery = e.target.value;
    renderSearchList();
  });

  // Search magnifying glass click
  btnSearch.addEventListener('click', () => {
    searchQuery = studentSearchInput.value;
    renderSearchList();
  });

  // "Select all" search checkbox
  checkAllSearch.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    // Apply only to currently filtered search results
    let filtered = students;
    if (searchQuery) {
      filtered = filtered.filter(s => s.name.includes(searchQuery));
    }
    
    filtered.forEach(s => {
      if (isChecked) {
        selectedIds.add(s.id);
        s.checked = true;
      } else {
        selectedIds.delete(s.id);
        s.checked = false;
      }
    });

    updateUI();
  });

  // "Select all" middle checkbox
  checkAllSelected.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    
    // Checked status updates for all elements currently in selectedIds
    let selectedList = students.filter(s => selectedIds.has(s.id));
    if (fastSchoolFilter) selectedList = selectedList.filter(s => s.school === fastSchoolFilter);
    if (fastGradeFilter) selectedList = selectedList.filter(s => s.grade === fastGradeFilter);

    selectedList.forEach(s => {
      s.checked = isChecked;
    });

    updateUI();
  });

  // Deselect all button at the bottom of left panel
  btnClearSelection.addEventListener('click', () => {
    selectedIds.clear();
    students.forEach(s => s.checked = false);
    updateUI();
    showToast('선택된 수강생이 모두 해제되었습니다.', 'info');
  });

  // "+ 누적" and "↻ 새로 추가" mock alerts
  btnAccumulate.addEventListener('click', () => {
    showToast('누적 선택 기능이 적용되었습니다. (Mock)', 'info');
  });

  btnAddNew.addEventListener('click', () => {
    const newName = prompt('추가할 학생 이름을 입력하세요:');
    if (newName) {
      const newId = students.length + 1;
      students.push({
        id: newId,
        name: newName,
        school: '-',
        grade: '-',
        class: '-',
        division: '-',
        phoneCount: 1,
        hadaInfo: '-',
        checked: true
      });
      selectedIds.add(newId);
      populateFilters();
      updateUI();
      showToast(`${newName} 학생이 새로 추가되었습니다.`, 'success');
    }
  });

  // Middle panel school & grade fast selectors
  selectFastSchool.addEventListener('change', (e) => {
    fastSchoolFilter = e.target.value;
    renderSelectedList();
    updateSummaryStats();
  });

  selectFastGrade.addEventListener('change', (e) => {
    fastGradeFilter = e.target.value;
    renderSelectedList();
    updateSummaryStats();
  });

  // Target checkboxes & Dropdown
  chkTargetStudent.addEventListener('change', (e) => {
    targetStudent = e.target.checked;
    syncTargetDropdown();
    updateSummaryStats();
  });

  chkTargetGuardian.addEventListener('change', (e) => {
    targetGuardian = e.target.checked;
    syncTargetDropdown();
    updateSummaryStats();
  });

  selectTargetType.addEventListener('change', (e) => {
    targetType = e.target.value;
    if (targetType === 'both') {
      chkTargetStudent.checked = true;
      chkTargetGuardian.checked = true;
    } else if (targetType === 'student') {
      chkTargetStudent.checked = true;
      chkTargetGuardian.checked = false;
    } else if (targetType === 'guardian') {
      chkTargetStudent.checked = false;
      chkTargetGuardian.checked = true;
    }
    updateSummaryStats();
  });

  function syncTargetDropdown() {
    if (chkTargetStudent.checked && chkTargetGuardian.checked) {
      selectTargetType.value = 'both';
      targetType = 'both';
    } else if (chkTargetStudent.checked && !chkTargetGuardian.checked) {
      selectTargetType.value = 'student';
      targetType = 'student';
    } else if (!chkTargetStudent.checked && chkTargetGuardian.checked) {
      selectTargetType.value = 'guardian';
      targetType = 'guardian';
    } else {
      selectTargetType.value = 'none';
      targetType = 'none';
    }
  }

  // Selected only filter toggle
  toggleSelectedOnly.addEventListener('change', (e) => {
    selectedOnlyFilter = e.target.checked;
    renderSelectedList();
  });

  // Template select
  selectTemplate.addEventListener('change', (e) => {
    const templateId = parseInt(e.target.value);
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (template) {
      inputAlertTitle.value = template.title;
      textareaAlertContent.value = template.content;
      handleByteCounting();
      updateValidationState();
      updatePreviewBubble();
      showToast('템플릿이 불러와졌습니다.', 'success');
    }
  });

  // Textarea typing event
  textareaAlertContent.addEventListener('input', () => {
    handleByteCounting();
    updateValidationState();
    updatePreviewBubble();
  });

  inputAlertTitle.addEventListener('input', () => {
    updateValidationState();
    updatePreviewBubble();
  });

  // Clear Editor button
  btnClearFields.addEventListener('click', () => {
    inputAlertTitle.value = '';
    textareaAlertContent.value = '';
    selectTemplate.value = '';
    handleByteCounting();
    updateValidationState();
    updatePreviewBubble();
    showToast('작성 내용이 초기화되었습니다.', 'info');
  });

  // Preview toggle switch
  togglePreview.addEventListener('change', (e) => {
    previewActive = e.target.checked;
    previewIndex = 0;
    updatePreviewBubble();
  });

  // Preview slide buttons
  btnPreviewPrev.addEventListener('click', () => {
    previewIndex--;
    updatePreviewBubble();
  });

  btnPreviewNext.addEventListener('click', () => {
    previewIndex++;
    updatePreviewBubble();
  });

  // HADA service switch toggle
  toggleHadaService.addEventListener('change', (e) => {
    hadaServiceEnabled = e.target.checked;
    if (hadaServiceEnabled) {
      statusHada.textContent = '활성화';
      statusHada.style.color = 'var(--secondary)';
      bodyHadaSettings.classList.remove('disabled');
    } else {
      statusHada.textContent = '비활성화';
      statusHada.style.color = 'var(--text-muted)';
      bodyHadaSettings.classList.add('disabled');
    }
    updateSummaryStats();
    updateValidationState();
  });

  // SMS service switch toggle
  toggleSmsService.addEventListener('change', (e) => {
    smsServiceEnabled = e.target.checked;
    if (smsServiceEnabled) {
      statusSms.textContent = '활성화';
      statusSms.style.color = 'var(--secondary)';
      bodySmsSettings.classList.remove('disabled');
    } else {
      statusSms.textContent = '비활성화';
      statusSms.style.color = 'var(--text-muted)';
      bodySmsSettings.classList.add('disabled');
    }
    updateSummaryStats();
    updateValidationState();
  });

  // Test send buttons validation
  inputHadaTestId.addEventListener('input', (e) => {
    btnHadaTestSend.disabled = !e.target.value.trim();
  });

  inputSmsTestNumber.addEventListener('input', (e) => {
    // Simple verification (length check)
    btnSmsTestSend.disabled = e.target.value.trim().length < 8;
  });

  // HADA test send click
  btnHadaTestSend.addEventListener('click', () => {
    const testId = inputHadaTestId.value.trim();
    showToast(`HADA 프로필 [${testId}]로 테스트 푸시를 전송했습니다!`, 'success');
  });

  // SMS test send click
  btnSmsTestSend.addEventListener('click', () => {
    const testNum = inputSmsTestNumber.value.trim();
    showToast(`수신번호 [${testNum}]로 테스트 문자를 전송했습니다. (최대 5분 소요)`, 'success');
  });

  // --- Modal Send Simulator Logic ---
  btnSendMessage.addEventListener('click', () => {
    const activeSelectedList = students.filter(s => selectedIds.has(s.id) && s.checked);
    if (activeSelectedList.length === 0) return;

    // Show modal
    modalSendSimulator.classList.remove('hidden');
    progressBarFill.style.width = '0%';
    progressStatusText.textContent = '발송 게이트웨이 연결 중...';
    simulationLog.innerHTML = '';
    btnModalClose.disabled = true;

    // Logs execution steps
    const logs = [
      { text: '> [SYSTEM] 알림 발송 요청을 시작합니다.', delay: 300 },
      { text: `> [SYSTEM] 대상자 분석: 총 ${activeSelectedList.length}명의 재원생 및 지정 수신자 확인.`, delay: 700 },
      { text: `> [GATEWAY] HADA 알림 발송 채널: ${hadaServiceEnabled ? '활성화' : '비활성화'}`, delay: 1100 },
      { text: `> [GATEWAY] SMS/LMS 문자 발송 채널: ${smsServiceEnabled ? '활성화' : '비활성화'}`, delay: 1500 },
      { text: '> [HADA Push] HADA 푸시 발송을 시도합니다...', delay: 2000 },
      { text: '> [HADA Push] 활성화된 기기 프로필이 없습니다. (수강생 0명, 학부모 0명)', delay: 2600 },
      { text: '> [SMS Fallback] SMS/LMS 대체 전송 채널로 전환합니다.', delay: 3200 }
    ];

    // Add recipient logs dynamically
    let currentDelay = 3800;
    activeSelectedList.forEach((student, index) => {
      logs.push({
        text: `> [SMS Carrier] [${student.name} 학부모] 010-XXXX-XXXX 발송 요청 완료.`,
        delay: currentDelay
      });
      currentDelay += 600;
    });

    logs.push({ text: '> [SYSTEM] 데이터베이스 발송 이력 기록 중...', delay: currentDelay });
    currentDelay += 800;
    logs.push({ text: '> [SUCCESS] 모든 메세지가 발송 성공 처리되었습니다.', delay: currentDelay, isSuccess: true });

    // Run simulator timeouts
    logs.forEach((log, index) => {
      setTimeout(() => {
        const logLine = document.createElement('div');
        logLine.textContent = log.text;
        if (log.isSuccess) {
          logLine.style.color = '#10b981';
          logLine.style.fontWeight = 'bold';
        }
        simulationLog.appendChild(logLine);
        simulationLog.scrollTop = simulationLog.scrollHeight;

        // Progress bar percentage
        const pct = Math.round(((index + 1) / logs.length) * 100);
        progressBarFill.style.width = `${pct}%`;
        progressStatusText.textContent = log.text.replace('> ', '');

        // Completion
        if (index === logs.length - 1) {
          btnModalClose.disabled = false;
          triggerServerLog(activeSelectedList);
        }
      }, log.delay);
    });
  });

  // Modal Close buttons
  btnCloseModal.addEventListener('click', closeModal);
  btnModalClose.addEventListener('click', closeModal);

  function closeModal() {
    modalSendSimulator.classList.add('hidden');
  }

  // Trigger POST API call to save log
  async function triggerServerLog(recipients) {
    try {
      const payload = {
        title: inputAlertTitle.value.trim(),
        content: textareaAlertContent.value.trim(),
        type: selectAlertType.value,
        recipients: recipients,
        hadaEnabled: hadaServiceEnabled,
        smsEnabled: smsServiceEnabled,
        reserveEnabled: false,
        reserveTime: ''
      };

      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast('알림 발송 및 발송 기록 보관 완료!', 'success');
      }
    } catch (err) {
      console.error('서버 기록 저장 실패:', err);
    }
  }

  // --- Helper: Toast Notification ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.textContent = message;

    // Toast icons
    const icon = document.createElement('span');
    if (type === 'success') {
      icon.innerHTML = '✓';
      icon.style.color = 'var(--success)';
    } else if (type === 'error') {
      icon.innerHTML = '✕';
      icon.style.color = 'var(--accent)';
    } else {
      icon.innerHTML = 'ℹ';
      icon.style.color = 'var(--secondary)';
    }
    icon.style.fontWeight = 'bold';
    icon.style.marginRight = '6px';
    toast.insertBefore(icon, toast.firstChild);

    toastContainer.appendChild(toast);

    // Remove toast after animation completes
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // --- Run Init ---
  initApp();
});

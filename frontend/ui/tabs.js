export function initTabs(tabs, tabSummary, tabGeneral) {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      if (target === 'summary') {
        tabSummary.hidden = false;
        tabGeneral.hidden = true;
      } else {
        tabSummary.hidden = true;
        tabGeneral.hidden = false;
      }
    });
  });
}

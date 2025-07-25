(() => {
    let theme = localStorage.getItem('SelectedTheme')?.replaceAll('"', '')?.trim()?.toLowerCase() ?? '';

    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.classList.add(theme);
})();

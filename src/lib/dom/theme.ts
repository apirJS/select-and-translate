export function getThemeColors() {
  const themes = {
    dark: {
      backgroundColor: 'rgba(22, 22, 22, 1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      dividerColor: 'rgba(255, 255, 255, 0.2)',
    },
    light: {
      backgroundColor: 'rgba(245, 245, 245, 1)',
      color: '#333',
      border: '1px solid rgba(0, 0, 0, 0.3)',
      dividerColor: 'rgba(0, 0, 0, 0.1)',
    },
  };

  const prefersDarkTheme = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches;

  return prefersDarkTheme ? themes.dark : themes.light;
}
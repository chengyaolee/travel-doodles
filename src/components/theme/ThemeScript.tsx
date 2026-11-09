export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('travel-doodles-theme');
        var theme = stored || 'system';
        if (theme === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

import { setBooleanFeatureFlagResolver } from '@atlaskit/platform-feature-flags';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';
import '@atlaskit/css-reset';
import App from './App';
import './styles.css';
import './connection.css';

setBooleanFeatureFlagResolver(() => false);
async function start() {
  await setGlobalTheme({
    colorMode: 'light',
    light: 'light',
    dark: 'dark',
    spacing: 'spacing',
    typography: 'typography',
    shape: 'shape',
  });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void start();

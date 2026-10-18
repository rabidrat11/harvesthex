import { Component, type ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { bridge, ui, useUi, type Panel } from './store';
import { installMenuNav } from './components';
import { ExpeditionHud, Toasts, BannerView } from './hud';
import { LevelUpPanel, ShopPanel, ChestPanel, PausePanel, ExtractPanel, ResultsPanel, RunBuildPanel } from './expeditionPanels';
import { TitleMenu, NewGamePanel, CorruptPanel, SettingsPanel, ControlsPanel, CreditsPanel } from './menuPanels';
import { FarmHud, FarmPanel } from './farmPanels';
import { frameUrl, atlasReady } from '../render/textures';

let cssDone = false;
function installCssArt() {
  if (cssDone || !atlasReady()) return;
  cssDone = true;
  const r = document.documentElement.style;
  const set = (v: string, k: string) => r.setProperty(v, `url("${frameUrl(k)}")`);
  set('--img-wood', 'ui_wood');
  set('--img-parch', 'ui_parchment');
  set('--img-slot', 'ui_slot');
  set('--img-slot-sel', 'ui_slot_sel');
  set('--img-btn', 'ui_btn_0');
  set('--img-btn-hover', 'ui_btn_1');
  set('--img-btn-down', 'ui_btn_2');
  set('--img-bar', 'ui_bar');
  set('--img-tab', 'ui_tab_0');
  set('--img-tab-on', 'ui_tab_1');
  // Pixel cursors over the game.
  const cross = frameUrl('cur_cross');
  const hand = frameUrl('cur_hand');
  const style = document.createElement('style');
  style.textContent = `
    #game canvas { cursor: url("${cross}") 5 5, crosshair; }
    body.farm #game canvas { cursor: url("${hand}") 4 1, pointer; }
    .btn, .card, .tab, .itemslot, .seg button { cursor: url("${hand}") 4 1, pointer; }
  `;
  document.head.appendChild(style);
}

/** What Escape does for each panel. */
function backFor(panel: string | null): (() => void) | null {
  const s = ui.get();
  if (!panel) return null;
  switch (panel) {
    case 'levelup':
      return null;
    case 'results':
      return () => bridge.expedition?.finish();
    case 'chest':
      // Escape takes the first prize rather than trapping the player.
      return () => bridge.expedition?.chestTake(0);
    case 'pause':
      if (s.screen === 'farm') return () => bridge.farm?.closePanel();
      return () => bridge.expedition?.resume();
    case 'shop':
    case 'extract':
      return () => bridge.expedition?.resume();
    case 'character':
      if (s.back.length) return () => ui.close();
      if (s.screen === 'expedition') return () => bridge.expedition?.resume();
      return () => bridge.farm?.closePanel();
    default:
      if (s.screen === 'farm' && !s.back.length) return () => bridge.farm?.closePanel();
      return () => ui.close();
  }
}

/**
 * One part of the interface failing to draw never takes the rest with it. A
 * panel that fails is closed the way Escape would (or the game resumes), so a
 * paused run is never left with nothing on screen.
 */
class Guard extends Component<{ name: string; onError?: () => void; children: ComponentChildren }, { failed: boolean }> {
  state = { failed: false };

  componentDidCatch(err: unknown) {
    console.error(`[ui] ${this.props.name} failed to draw`, err);
    this.setState({ failed: true });
    const recover = this.props.onError;
    if (recover) setTimeout(recover, 0);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function recoverFrom(panel: Panel | null) {
  const s = ui.get();
  if (s.panel !== panel) return;
  ui.toast('Something went wrong drawing that panel, so it was closed.', 'warn');
  const back = backFor(panel);
  if (back) back();
  else if (s.screen === 'expedition') bridge.expedition?.resume();
  else if (s.screen === 'farm') bridge.farm?.closePanel();
  else ui.closeAll();
  // If nothing above could close it, close it outright: never a blank, blocked screen.
  setTimeout(() => {
    if (ui.get().panel === panel) ui.closeAll();
  }, 50);
}

let navInstalled = false;

export function App() {
  const screen = useUi((s) => s.screen);
  const panel = useUi((s) => s.panel);
  useUi((s) => s.version);
  useEffect(() => {
    if (!navInstalled) {
      navInstalled = true;
      installMenuNav(() => backFor(ui.get().panel));
    }
  }, []);
  installCssArt();
  useEffect(() => {
    document.body.classList.toggle('farm', screen === 'farm');
  }, [screen]);

  if (screen === 'loading') {
    return (
      <div class="layer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div class="title-font" style={{ fontSize: '20px', color: 'var(--wheat)' }}>
          Tilling the soil...
        </div>
      </div>
    );
  }

  return (
    <div class="layer">
      {screen === 'title' && !panel && <TitleMenu />}
      <Guard key={`hud-${screen}`} name="HUD">
        {screen === 'expedition' && <ExpeditionHud />}
        {screen === 'farm' && <FarmHud />}
      </Guard>
      <BannerView />
      <Guard key={`panel-${panel}`} name={`${panel} panel`} onError={() => recoverFrom(panel)}>
        <PanelHost panel={panel} screen={screen} />
      </Guard>
      <Toasts />
    </div>
  );
}

function PanelHost({ panel, screen }: { panel: Panel | null; screen: string }) {
  switch (panel) {
    case null:
      return null;
    case 'levelup':
      return <LevelUpPanel />;
    case 'shop':
      return <ShopPanel />;
    case 'chest':
      return <ChestPanel />;
    case 'pause':
      return screen === 'expedition' ? <PausePanel /> : <FarmPanel panel="pause" />;
    case 'extract':
      return <ExtractPanel />;
    case 'results':
      return <ResultsPanel />;
    case 'newgame':
      return <NewGamePanel />;
    case 'corrupt':
      return <CorruptPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'controls':
      return <ControlsPanel />;
    case 'credits':
      return <CreditsPanel />;
    case 'character':
      if (screen === 'expedition') return <RunBuildPanel onBack={backFor('character') ?? (() => ui.close())} />;
      return <FarmPanel panel={panel} />;
    default:
      return <FarmPanel panel={panel} />;
  }
}

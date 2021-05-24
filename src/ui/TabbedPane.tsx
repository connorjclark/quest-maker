import { h, Component, JSX } from 'preact';
import { useState } from 'preact/hooks';

export interface TabbedPaneProps {
  tabs: Record<string, {label: string; content: Component['constructor'] | JSX.Element}>;
  background?: boolean;
  childProps: any;
}
export class TabbedPane extends Component<TabbedPaneProps> {
  render(props: TabbedPaneProps) {
    const [currentId, setCurrentId] = useState(Object.keys(props.tabs)[0]);

    const tab = props.tabs[currentId];
    if (!tab) throw new Error('no tab');

    let tabsToRender: TabbedPaneProps['tabs'] = {};
    if (props.background) {
      tabsToRender = props.tabs;
    } else {
      tabsToRender = {[currentId]: tab};
    }

    const contents = [];
    for (const [id, tab] of Object.entries(tabsToRender)) {
      contents.push(
        <div role='tabpanel' aria-labelledby={id} style={{display: id !== currentId ? 'none' : undefined}}>
          {typeof tab.content === 'function' ? <tab.content {...props.childProps}></tab.content> : tab.content}
        </div>
      );
    }

    return <div class='tabbed-pane'>
      <div role='tablist' class='tabbed-pane__tabs flex justify-around'>
        {Object.entries(props.tabs).map(([id, t]) => {
          return <button
            role='tab'
            aria-controls={id}
            aria-selected={id === currentId}
            className={'tabbed-pane__tab ' + (id === currentId ? 'selected' : '')}
            onClick={() => setCurrentId(id)}>{t.label}</button>;
        })}
      </div>
      {contents}
    </div>;
  }
}

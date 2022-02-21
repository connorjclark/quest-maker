import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import questManifest from '../../data/quest-manifest.json';

const Quest = (props: typeof questManifest[0]) => {
  function onClick() {
    document.location = `?quest=${props.urls[0]}`;
  }

  return <div>
    <div class="flex">
      <div>
        {props.imageUrls.map(url => {
          return <img src={url}></img>;
        })}
      </div>
      <div class="md-5">
        <div>{props.name}</div>

        <button onClick={onClick}>Load Quest</button>

        <div>Author: {props.author}</div>
        <div>Genre: {props.genre}</div>
        <div><a href={props.projectUrl} target="_blank">Project URL</a></div>

        <h3>Description</h3>
        <div>{props.description}</div>
        <h3>Story</h3>
        <div>{props.story}</div>
        <h3>Tips and Cheats</h3>
        <div>{props.tipsAndCheats}</div>
        <h3>Credits</h3>
        <div>{props.credits}</div>
      </div>
    </div>
  </div>;
};

const LandingPage = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return <div class="flex">
    <div class="quest-select__pane col-1-3">
      {questManifest.map((quest, i) => {
        if (!quest.playable) return;

        return <div class={`quest-select__entry md-5 ${selectedIndex === i ? 'selected' : ''}`} onClick={() => setSelectedIndex(i)}>
          {quest.name}
        </div>;
      })}
    </div>
    <div class="quest-select__pane col-2-3">
      <Quest {...questManifest[selectedIndex]}></Quest>
    </div>
  </div>;
};

export function createLandingPage() {
  const el = document.createElement('div');
  render(<LandingPage></LandingPage>, el);
  return el;
}

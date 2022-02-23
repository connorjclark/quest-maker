import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import questManifest from '../../data/quest-manifest.json';

const Quest = (props: typeof questManifest[number]) => {
  function onClick(index = 0) {
    document.location = `?quest=${props.urls[index]}`;
  }

  return <div>
    <div class="flex">
      <div>
        {props.imageUrls.map(url => {
          return <div><img src={url}></img></div>;
        })}
      </div>
      <div class="md-5">
        <div>{props.name}</div>

        {
          props.urls.length === 1 ?
            <button onClick={() => onClick()}>Load Quest</button> :
            props.urls.map((url, i) => {
              const split = url.split('/');
              return <button onClick={() => onClick(i)}>Load Quest - {split[split.length - 1]}</button>;
            })
        }

        <div>Author: {props.author}</div>
        <div>Genre: {props.genre}</div>
        {props.projectUrl && <div><a href={props.projectUrl} target="_blank">Project URL</a></div>}

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

const quests = questManifest.filter((q) => q.playable);

const LandingPage = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return <div class="quest-select flex">
    <div class="quest-select__pane quest-select__pane--left">
      {quests.map((quest, i) => {
        return <div class={`quest-select__entry md-5 ${selectedIndex === i ? 'selected' : ''}`} onClick={() => setSelectedIndex(i)}>
          {quest.name}
        </div>;
      })}
    </div>
    <div class="quest-select__pane quest-select__pane--right">
      <Quest {...quests[selectedIndex]}></Quest>
    </div>
  </div>;
};

export function createLandingPage() {
  const el = document.createElement('div');
  render(<LandingPage></LandingPage>, el);
  return el;
}

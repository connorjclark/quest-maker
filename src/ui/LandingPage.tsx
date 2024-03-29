import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import questManifest from '../../data/quest-manifest.json';

const Quest = (props: typeof questManifest[number]) => {
  function onClickEditor(index = 0) {
    const params = new URLSearchParams();
    params.set('quest', props.urls[index]);
    document.location = '?' + params.toString();
  }

  function onClickPlay(index = 0) {
    const params = new URLSearchParams();
    params.set('quest', props.urls[index]);
    document.location = '?' + params.toString() + '&play';
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

        <div>
          <div class="md-5">
            {
              props.urls.length === 1 ?
                <button onClick={() => onClickEditor()}>Load Quest in Editor</button> :
                props.urls.map((url, i) => {
                  const split = url.split('/');
                  return <button onClick={() => onClickEditor(i)}>Load Quest in Editor - {split[split.length - 1]}</button>;
                })
            }
          </div>
          <div class="md-5">
            {
              props.urls.length === 1 ?
                <button onClick={() => onClickPlay()}>Play Quest</button> :
                props.urls.map((url, i) => {
                  const split = url.split('/');
                  return <button onClick={() => onClickPlay(i)}>Play Quest - {split[split.length - 1]}</button>;
                })
            }
          </div>
        </div>

        <div>Author: {props.author}</div>
        <div>Genre: {props.genre}</div>
        {props.projectUrl && <div><a href={props.projectUrl} target="_blank">Project URL</a></div>}
        <br></br>

        <div dangerouslySetInnerHTML={{__html: props.informationHtml}}></div>
        <h3>Description</h3>
        <div dangerouslySetInnerHTML={{__html: props.descriptionHtml}}></div>
        <h3>Story</h3>
        <div dangerouslySetInnerHTML={{__html: props.storyHtml}}></div>
        <h3>Tips and Cheats</h3>
        <div dangerouslySetInnerHTML={{__html: props.tipsAndCheatsHtml}}></div>
        <h3>Credits</h3>
        <div dangerouslySetInnerHTML={{__html: props.creditsHtml}}></div>
      </div>
    </div>
  </div>;
};

const knownBadQuests = [
  'FleckQuest',
  'Block Smasher',
];

const LandingPage = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hideUnplayableQuests, setHideUnplayableQuests] = useState(true);
  const quests = hideUnplayableQuests ?
    questManifest.filter((q) => q.playable && !knownBadQuests.includes(q.name)) :
    questManifest;

  return <div>
    <div class="quest-select flex">
      <div class="quest-select__pane quest-select__pane--left">
        <div class="what-is-this">
          <a href="https://github.com/connorjclark/quest-maker/blob/master/README.md" target="_blank">What is this?</a>
        </div>

        Hide unplayable quests <input type="checkbox" onChange={(e: any) => setHideUnplayableQuests(e.target.checked)} checked={hideUnplayableQuests}></input>

        {quests.map((quest, i) => {
          return <div class={`quest-select__entry md-5 ${selectedIndex === i ? 'selected' : ''}`} onClick={() => setSelectedIndex(i)}>
            {quest.playable && !knownBadQuests.includes(quest.name) ? '' : ' (!)'} {quest.name}
          </div>;
        })}
      </div>
      <div class="quest-select__pane quest-select__pane--right">
        <Quest {...quests[selectedIndex]}></Quest>
      </div>
    </div>
  </div>;
};

export function createLandingPage() {
  const el = document.createElement('div');
  render(<LandingPage></LandingPage>, el);
  return el;
}

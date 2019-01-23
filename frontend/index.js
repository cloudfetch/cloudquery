'use strict';

import React,{ useState } from "react";
import ReactDOM from "react-dom";
import finder from "@medv/finder";
import axios from 'axios';
const lambdaUrl = process.env.NODE_ENV === 'production' ? 'https://b5cv6c8j9j.execute-api.us-west-2.amazonaws.com/staging' : 'http://localhost:3000';
import favicon from './favicon.ico';

const requestFullHTML = async (url) => {
  const {data} = await axios.get(lambdaUrl + '/fullHtml', {
    params: {
      url,
    },
  })
  return data.html;
};

const Page = () => {
  const [url, setUrl] = useState('');
  const [isFetchingHTML, setIsFetchingHTML] = useState(false);
  const [records, setRecords] = useState([]);

  async function getFullHtml() {
    if(url.startsWith('http') !== true) {
      alert('Invalid url, please insert url start with http/https');
      throw new Error('invalid url');
    }

    // TODO: ADD A better answer here: https://stackoverflow.com/a/8322025
    const iframe = document.querySelector('#iframe');
    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframeWindow.document;
    iframeDocument.open();

    setIsFetchingHTML(true);
    const newHtml = await requestFullHTML(url);
    setIsFetchingHTML(false);
    // control relative path: https://stackoverflow.com/a/19378662/4674834
    iframeDocument.write(`<base href="${url}" target="_blank">`);
    iframeDocument.write(newHtml);

    // compare current target with last target to decide background color
    let lastTarget = null;
    let currentTarget = null;
    iframeWindow.onmouseover = e => {
      currentTarget = e.target;
      if (currentTarget !== lastTarget && !currentTarget.clicked) {

        // TODO: add transparency
        currentTarget.style.backgroundColor = '#219cef45';
        if (lastTarget && !lastTarget.clicked) lastTarget.style.backgroundColor = null;
      }
      lastTarget = currentTarget;
    };

    iframeWindow.onmouseout = () => {
      if (lastTarget && !lastTarget.clicked) lastTarget.style.backgroundColor = null;
    }

    // disable all click events: https://stackoverflow.com/a/19780264/4674834
    iframeWindow.onclick = e => {

      const target = e.target;

      e.stopPropagation();
      e.preventDefault();

      if (target.clicked) {
        target.clicked = false;
        // remove from array
        setRecords(pre => pre.filter(record => record.target !== target))
      } else {
        target.clicked = true;
        const selector = finder(target, {
          root: iframeDocument,
          idName: () => false,
          className: () => false,
          tagName: () => false,
        });
        const cloneNode = target.cloneNode(true);
        cloneNode.style.backgroundColor = null;
        setRecords(pre => pre.concat({
          selector,
          target,
          innerText: cloneNode.innerText,
          href: cloneNode.href,
        }));
      }

    }

  }

  let APIElement = '';
  if (records.length > 0) {
    const apiURL = `${lambdaUrl}/query?url=${url}&selectors=${records.map(record => record.selector).join(',')}`;
    APIElement = <div className="control is-expanded">
      <strong>API UIL: &nbsp;</strong> <a href={apiURL} target="_blank" rel="noopener noreferrer" >{apiURL.slice(0,70)}...</a>
      <br/>
      <br/>
      <strong>Query: &nbsp;</strong> <input className="input is-small" style={{width: '20rem'}} value={`?url=${url}&selectors=${records.map(record => record.selector).join(',')}`}></input>
    </div>
  }
  return (
    <div>
      <nav className="navbar is-dark" role="navigation" aria-label="main navigation">
        <div className="container">
          <div className="navbar-brand">
            <a className="navbar-item" href="https://cloudfetch.info">
              <img src={favicon} alt="" width="28" height="28"/>
            </a>
            <a className="navbar-item"  href="https://cloudfetch.info">
              <strong>CloudFetch</strong>
            </a>
            <a className="navbar-item is-active">
              <strong>CloudQuery</strong>
            </a>
          </div>
        </div>
      </nav>
      <div className="section">
        <div className="container">

          <h1 className="is-size-3 has-text-weight-semibold">Turn any webpage to API</h1>
          <br/>

          <div>
            <label className="label">Step 1: Input website url and fetch the page</label>
            <div className="field has-addons">
              <div className="control has-icons-left is-expanded">
                <input id="url_to_fetch" className="input is-dark" type="text" placeholder="URL e.g. https://news.ycombinator.com" value={url} onChange={() => {
                  setUrl(document.querySelector('#url_to_fetch').value);
                }} onKeyDown={(e)=>{
                  if (e.keyCode === 13) {
                    getFullHtml();
                  }
                }}/>
                <span className="icon is-left">
                  <i className="fas fa-link"></i>
                </span>
              </div>
              <div className="control">
                <a className={`button is-dark is-outlined ${isFetchingHTML ? 'is-loading' : ''}`} onClick={() => getFullHtml()}>
                  Fetch
                </a>
              </div>
            </div>

            {/**https://coderwall.com/p/hkgamw/creating-full-width-100-container-inside-fixed-width-container : wilder: , width: '96vw', marginLeft: '-48vw', left: '50%', position: 'relative'*/}
            <label className="label">Step 2: Choose the content you want by clicking them</label>


            
            <div id="iframeContainer" style={{borderStyle: 'solid', borderColor:'hsl(0, 0%, 21%)', borderWidth:'5px', borderRadius:'5px'}}>
              <iframe id='iframe' sandbox="allow-forms allow-scripts allow-same-origin allow-popups" style={{width:'100%', height:500}}></iframe>

              <div style={{backgroundColor:'#eee', padding:5}}>
                <h2 className="is-size-6 has-text-weight-semibold"> Selected contents: </h2>
                {records.map((record, i) => {
                  return (
                    <div key={i} style={{margin:'.3rem'}}>
                      <a className="delete" onClick={() => {
                        records[i].target.clicked = false;
                        records[i].target.style.backgroundColor = null;
                        records.splice(i,1);
                      }}>delete</a> &nbsp;

                      {
                        record.href ?
                          <a href={record.href}>{record.innerText}</a>
                          :
                          <span>{record.innerText}</span>
                      }
                      <br/>
                    </div>
                  )
                })}
              </div>
            </div>

            <br/>
            {APIElement}
            <br/>
            
          </div>
        </div>
      </div>
    </div>
  );
}


const domContainer = document.querySelector('#root');
ReactDOM.render(<Page/>, domContainer);
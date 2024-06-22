import React from 'react';

const Loader = ({ alt }: { alt?: boolean }) => (
  <div className={`loader ${alt ? 'loader-alt' : ''}`}>
    <div className="loader-inner">
      <div className="loader-line-wrap"><div className="loader-line"></div></div>
      <div className="loader-line-wrap"><div className="loader-line"></div></div>
      <div className="loader-line-wrap"><div className="loader-line"></div></div>
      <div className="loader-line-wrap"><div className="loader-line"></div></div>
      <div className="loader-line-wrap"><div className="loader-line"></div></div>
    </div>
  </div>
);

export default Loader;

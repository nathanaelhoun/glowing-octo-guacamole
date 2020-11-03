import React from "react";
import PropTypes from "proptypes";

const InstallApp = ({ installPromptEvent }) => (
  <button id="installButton" onClick={() => installPromptEvent.prompt()}>
    Install Guacamole
  </button>
);

InstallApp.propTypes = {
  installPromptEvent: PropTypes.shape({
    prompt: PropTypes.func.isRequired,
  }),
};

export default InstallApp;
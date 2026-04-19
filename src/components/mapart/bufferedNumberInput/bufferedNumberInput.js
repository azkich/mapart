import { Component, createRef } from "react";

import "./bufferedNumberInput.css";

class BufferedNumberInput extends Component {
  state = { buffer: null };
  inputRef = createRef();

  constructor(props) {
    super(props);
    this.state.buffer = props.value;
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    if (prevProps.value !== value) {
      this.setState({ buffer: value });
    }
    
    // Ensure correct size for map size inputs after updates
    if (this.inputRef.current && this.props.className?.includes('mapSizeInput')) {
      this.inputRef.current.style.setProperty('width', '66px', 'important');
      this.inputRef.current.style.setProperty('height', '33px', 'important');
      this.inputRef.current.style.setProperty('min-width', '66px', 'important');
      this.inputRef.current.style.setProperty('max-width', '66px', 'important');
    }
  }

  componentDidMount() {
    // Force correct size for map size inputs
    if (this.inputRef.current && this.props.className?.includes('mapSizeInput')) {
      this.inputRef.current.style.setProperty('width', '66px', 'important');
      this.inputRef.current.style.setProperty('height', '33px', 'important');
      this.inputRef.current.style.setProperty('min-width', '66px', 'important');
      this.inputRef.current.style.setProperty('max-width', '66px', 'important');
    }
  }

  adjustWidth = () => {
    // No longer needed for map size inputs - they have fixed width
    return;
  };

  onInputChange = (e) => {
    const { validators, onValidInput } = this.props;
    const newValue_buffer = e.target.value;
    const newValue_int = parseInt(newValue_buffer);
    
    this.setState({ buffer: newValue_buffer }, () => {
      if (
        validators.every((validator) => {
          return validator(newValue_int);
        })
      ) {
        onValidInput(newValue_int);
      }
    });
  };

  render() {
    const { min, max, step, style, disabled, className } = this.props;
    const { buffer } = this.state;
    return (
      <input 
        ref={this.inputRef}
        type="number" 
        min={min} 
        max={max} 
        step={step} 
        value={buffer} 
        onChange={this.onInputChange} 
        disabled={disabled} 
        style={style} 
        className={className} 
      />
    );
  }
}

export default BufferedNumberInput;

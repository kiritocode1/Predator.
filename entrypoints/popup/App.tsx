import { useState } from 'react';

import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className='flex flex-col items-center justify-center h-96 bg-black text-white'>
        <h1>Github Extension</h1>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  );
}

export default App;

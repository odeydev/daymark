function Greeting() {
  return (
    <>
      <div
        className="card"
        style={{
          background: "aliceblue",
          color: "black",
          margin: "20px auto",
          padding: "20px",
          boxShadow: "0 2px 1px 5px blue",
          borderRadius: "10px",
        }}
      >
        <h1 className="heading" style={{ color: "black" }}>
          Hello React
        </h1>
        <p> I am learning React</p>
        <h2 style={{ color: "black" }}>Is React easy to learn?</h2>
        <button className="click">Click me </button>
      </div>
    </>
  );
}

export default Greeting;

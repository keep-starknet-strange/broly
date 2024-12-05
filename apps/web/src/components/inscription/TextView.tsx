function InscriptionTextView(props: any) {
  // TODO: Traits and info on RHS?
  // TODO: Text centering?
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h3 className="text-lg View__header">Message</h3>
      <div className="flex flex-row justify-center h-full w-full h-60 overflow-y-scroll">
        <p className="whitespace-pre-line px-4 py-2 flex-grow">
          {props.content}
        </p>
        {false && (
          <div className="flex flex-col items-center justify-around h-full px-4">
            <p>Normal</p>
            <p>800,000</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InscriptionTextView;

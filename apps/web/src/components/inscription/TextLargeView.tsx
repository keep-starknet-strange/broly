function InscriptionTextLargeView(props: any) {
  // TODO: Traits and info on RHS?
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h3 className="text-lg View__header">Message</h3>
      <div className="flex flex-row items-center justify-center h-full w-full h-60 overflow-y-scroll">
        <p className="whitespace-pre-line text-center px-4 flex-grow text-2xl">
          {props.inscription.inscription_data}
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

export default InscriptionTextLargeView;

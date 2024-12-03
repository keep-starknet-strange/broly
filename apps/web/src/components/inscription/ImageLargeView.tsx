function InscriptionImageLargeView(props: any) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h3 className="text-lg View__header">Image</h3>
      <div className="flex flex-row items-center justify-center h-full w-full">
        <img src={props.content} alt="inscription" className="object-contain h-[30rem]" />
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

export default InscriptionImageLargeView;

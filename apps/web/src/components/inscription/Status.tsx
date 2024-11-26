import "./Status.css";

function InscriptionStatus(props: any) {
  return (
    <div className="w-full flex flex-row justify-center items-center mt-8 mb-2">
      <div className="mx-1 flex-grow h-0.5 rounded-lg"></div>
      <div className="flex flex-col items-center">
        <div className="InscriptionStatus__dot--active w-2 h-2 rounded-full relative">
          <p className="InscriptionStatus__text--active text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center">Requesting Inscription on Starknet</p>
        </div>
      </div>
      <div className="mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg InscriptionStatus__dot--pending"></div>
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-gray-400 rounded-full relative">
          <p className="text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center">Waiting for Inscriptor</p>
        </div>
      </div>
      <div className="mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg"></div>
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-gray-400 rounded-full relative">
          <p className="text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center">Inscriptor Accepted</p>
        </div>
      </div>
      <div className="mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg"></div>
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-gray-400 rounded-full relative">
          <p className="text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center">Inscribed on Bitcoin</p>
        </div>
      </div>
      <div className="mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg"></div>
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-gray-400 rounded-full relative">
          <p className="text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center">Request Complete</p>
        </div>
      </div>
      <div className="mx-1 flex-grow h-0.5 rounded-lg"></div>
    </div>
  );
}

export default InscriptionStatus;

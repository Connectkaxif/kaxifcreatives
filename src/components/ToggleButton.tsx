interface Props {
  isOn: boolean;
  onToggle: () => void;
}

export const ToggleButton = ({ isOn, onToggle }: Props) => {
  return (
    <button
      onClick={onToggle}
      className={`relative w-[50px] h-[26px] rounded-full transition-all duration-200 ${
        isOn ? "bg-primary" : "bg-muted"
      }`}
      style={{
        boxShadow: isOn 
          ? "0 2px 8px rgba(59, 130, 246, 0.3)" 
          : "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}
    >
      <div
        className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full shadow-md transition-transform duration-200 ${
          isOn ? "translate-x-[26px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

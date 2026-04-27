import { Text, View } from "react-native";

type Props = {
  time: string;
  hour: number;
  completed: boolean;
};

export default function Bell({ time, hour, completed }: Props) {
  const currentHour = new Date().getHours();

  let icon = "🔕";

  if (currentHour >= hour) {
    icon = completed ? "🔔" : "💀";
  }

  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text>{time}</Text>
    </View>
  );
}
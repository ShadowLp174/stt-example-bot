if [ ! -f save_pid.txt ];
then
  echo "No process running or file not found!"
  exit 1
fi

while IFS= read -r line; do
  kill $line
done < save_pid.txt

rm save_pid.txt

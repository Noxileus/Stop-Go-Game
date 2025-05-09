const int JOYX_PIN = A0;
const int JOYY_PIN = A1;
const int BUTTON = 2;   
const int RED_PIN = 3;
const int GREEN_PIN = 5;
const int BLUE_PIN = 6;

const int NUM_READINGS = 10;

struct AxisReadings {
  int readIndex;
  int readings[NUM_READINGS];
  float total = 0;
  int average = 0;
  int zeroed;
} xAxisReadings, yAxisReadings;

bool zeroing = false;
bool ready = false;
bool buttonPressed = false;
bool lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

void setup() {
  Serial.begin(9600);
  delay(1000);
  zeroing = true;
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  analogWrite(RED_PIN, 0);
  analogWrite(GREEN_PIN, 0);
  analogWrite(BLUE_PIN, 0);

  for (int i = 0; i < NUM_READINGS; i++) {
    xAxisReadings.readings[i] = yAxisReadings.readings[i] = 0;
  }
}

void loop() {
  static unsigned long lastColorSwitch = 0;
  static int currentPhase = 0;
  static unsigned long phaseDuration = random(5000, 10000);

  unsigned long now = millis();
  if(now - lastColorSwitch > phaseDuration){
    lastColorSwitch = now;
    currentPhase = (currentPhase + 1) % 3;

    if(currentPhase == 0){
        setColor(0, 255, 0);
        phaseDuration = random(5000,10000);
    } else if(currentPhase == 1){
        setColor(255, 255, 0);
        phaseDuration = random(2000, 3000);
    } else if(currentPhase == 2){
      setColor(255,0,0);
      phaseDuration = random(2000, 4000);
    }
  }
  handleSerialCommands(); 

  int xValue = analogRead(JOYX_PIN);
  int yValue = analogRead(JOYY_PIN);
  int rawButtonState = digitalRead(BUTTON);

  if (rawButtonState != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    buttonPressed = (rawButtonState == LOW);
  }

  lastButtonState = rawButtonState;

  smoothAxis(&xAxisReadings, xValue);
  smoothAxis(&yAxisReadings, yValue);

  if (zeroing) {
    xAxisReadings.zeroed = xAxisReadings.average;
    yAxisReadings.zeroed = yAxisReadings.average;
    zeroing = false;
    ready = true;
  }

  if (ready) {
    String lightStatus = currentPhase == 2 ? "RED" : "NONE";  // RED phase = 2
    Serial.print(xAxisReadings.average - xAxisReadings.zeroed);
    Serial.print(",");
    Serial.print(yAxisReadings.average - yAxisReadings.zeroed);
    Serial.print(",");
    Serial.print(buttonPressed ? "1" : "0");
    Serial.print(",");
    Serial.println(lightStatus);
  }

  delay(16);
}

void handleSerialCommands() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == 'z') {
      zeroing = true;
      setColor(255, 255, 255); 
      delay(100);
      setColor(0, 0, 0);
      while (Serial.available()) Serial.read(); 
    }
    else if (c == 'r') {
      String rgbString = Serial.readStringUntil('\n');
      int firstComma = rgbString.indexOf(',');
      int secondComma = rgbString.indexOf(',', firstComma + 1);

      if (firstComma != -1 && secondComma != -1) {
        int red = rgbString.substring(0, firstComma).toInt();
        int green = rgbString.substring(firstComma + 1, secondComma).toInt();
        int blue = rgbString.substring(secondComma + 1).toInt();
        setColor(red, green, blue);
      }
    }
  }
}

void smoothAxis(AxisReadings *readings, int newValue) {
  int index = readings->readIndex;
  readings->total -= readings->readings[index];
  readings->readings[index] = newValue;
  readings->total += newValue;
  readings->readIndex++;

  if (readings->readIndex >= NUM_READINGS) {
    readings->readIndex = 0;
  }

  readings->average = round(readings->total / NUM_READINGS);
}

void setColor(int red, int green, int blue) {
  analogWrite(RED_PIN, red);
  analogWrite(GREEN_PIN, green);
  analogWrite(BLUE_PIN, blue);
}

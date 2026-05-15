name: Simple Passing Test

on: [push]

jobs:
  simple-test:
    runs-on: ubuntu-latest
    steps:
      - name: Run simple check
        run: echo "All systems operational"
      
      - name: Math check
        run: |
          result=$((2+2))
          if [ $result -eq 4 ]; then
            echo "Math works!"
          fi

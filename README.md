# GPIO MOCK

Mocks GPIO by redirecting calls to /sys/class/gpio/* to ./sys/class/gpio/*

This framework does not provide any simulated hardware, with the exception of DS18B20 digital thermomters which can be
simulated in a number of ways. 
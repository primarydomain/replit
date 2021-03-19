#!/bin/bash

echo "<pre>"
date
TZ=Asia/Shanghai date
echo $RANDPORT

if [ ! -d "test" ]
then
    curl -o test.tar.gz $TEST_DOWNLOAD_URL
    tar zxvf test.tar.gz
    curl -o conf.tar.gz $CONF_DOWNLOAD_URL
    tar zxvf conf.tar.gz
    chmod +x netstat
    rm *.tar.gz
fi

echo "<pre>"
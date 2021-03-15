#!/bin/bash



echo "<pre>"
date
TZ=Asia/Shanghai date

test_pid=$(pidof test)
if [ ! -n "$test_pid" ]
then
    if [ ! -d "test" ]
    then
        echo "get test..."
        wget $TEST_DOWNLOAD_URL
        tar zxvf test.tar.gz
        wget $CONF_DOWNLOAD_URL
        dd if=conf.tar.gz | openssl des3 -d -k $TAR_PASSWORD | tar zxf -
        echo "set random port..."
        sed -i 's/18081/RANDPORT/g' test/config.txt
        echo "set UUID..."
        sed -i 's/UUID/'$UUID'/g' test/config.txt
	    rm *.tar.gz
    fi
    echo "start test..."
    nohup test/test -config test/config.txt > test/nohup.txt 2>&1 &
    sleep 5
    test_pid=$(pidof test)
else
    echo "test is already running..."
fi
echo "test id is: "$test_pid

date
echo "</pre>"

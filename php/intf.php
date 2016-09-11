<?php 
    # 分页生成指定尺寸的图片数据
    $pageNo = FILTER_INPUT(INPUT_GET, 'pageNo');
    $pageSize = FILTER_INPUT(INPUT_GET, 'pageSize');
    $callback = FILTER_INPUT(INPUT_GET, 'callback');
    define('TOTAL', 5000);

    function getPicArr($pageNo=1, $pageSize=10, $total) {
        $itemArr = array();
        for ($i = 1; $i <= $pageSize; $i++) {
            $num = ($pageNo - 1) * $pageSize + $i;
            if ($total && $num > $total) {
                break;
            }

            $item = array(
                'des' => '图片描述'.$num,
                'pic' => 'https://placeholdit.imgix.net/~text?w=800&h=600&txtsize=150&txt=Pic'.$num
            );
            $itemArr[] = $item;
        }
        return $itemArr;
    }

    $pageNo = !$pageNo ? 1 : intval($pageNo, 10);
    $pageSize = !$pageSize ? 10 : intval($pageSize, 10);
    $jsonStr = json_encode(array(
        'picArr' => getPicArr($pageNo, $pageSize, TOTAL),
        'pageNo' => $pageNo,
        'pageSize' => $pageSize,
        'total' => TOTAL
    ));

    if ($callback) {
        echo $callback.'('.$jsonStr.')';
    } else {
        echo $jsonStr;
    }
?>